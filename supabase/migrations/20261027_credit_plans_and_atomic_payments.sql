-- Pockito: transactional credit plans and installment payments
-- Safe additive migration: existing transactions/wallets are not rewritten.
begin;

create or replace function public.create_credit_plan_with_schedule(
    p_credit_account_id uuid,
    p_description text,
    p_principal_amount numeric,
    p_interest_type text,
    p_interest_total numeric,
    p_fee_total numeric,
    p_tenor_months integer,
    p_first_due_date date,
    p_purchase_date date,
    p_purchase_record_mode text,
    p_purchase_category_id uuid,
    p_existing_transaction_id uuid,
    p_paid_installments integer
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_plan_id uuid;
    v_transaction_id uuid;
    v_category_type text;
    v_existing_type text;
    v_existing_amount numeric;
    v_total_principal_cents bigint;
    v_total_interest_cents bigint;
    v_total_fee_cents bigint;
    v_principal_cents bigint;
    v_interest_cents bigint;
    v_fee_cents bigint;
    v_due_month date;
    v_next_month date;
    v_due_date date;
    v_day integer;
    v_i integer;
begin
    if v_user_id is null then raise exception 'Authentication required'; end if;
    if p_description is null or length(btrim(p_description)) not between 1 and 160 then
        raise exception 'Nama pembelian wajib diisi (maksimal 160 karakter)';
    end if;
    if p_principal_amount is null or p_principal_amount <= 0 then raise exception 'Nominal pokok harus lebih dari nol'; end if;
    if p_interest_total is null or p_interest_total < 0 or p_fee_total is null or p_fee_total < 0 then
        raise exception 'Bunga dan biaya tidak boleh negatif';
    end if;
    if p_interest_type not in ('none', 'fixed', 'variable') then raise exception 'Jenis bunga tidak valid'; end if;
    if p_interest_type = 'none' and p_interest_total <> 0 then raise exception 'Pilih jenis bunga tetap/berubah jika ada bunga'; end if;
    if p_tenor_months is null or p_tenor_months < 1 or p_tenor_months > 600 then raise exception 'Tenor harus 1–600 bulan'; end if;
    if p_first_due_date is null or p_purchase_date is null then raise exception 'Tanggal pembelian dan jatuh tempo wajib diisi'; end if;
    if p_paid_installments is null or p_paid_installments < 0 or p_paid_installments > p_tenor_months then
        raise exception 'Jumlah cicilan yang sudah dibayar tidak valid';
    end if;
    if p_purchase_record_mode not in ('create', 'link', 'skip') then raise exception 'Mode pencatatan pembelian tidak valid'; end if;

    perform 1 from public.credit_accounts
      where id = p_credit_account_id and user_id = v_user_id and is_active = true
      for share;
    if not found then raise exception 'Akun kredit tidak ditemukan atau tidak aktif'; end if;

    if p_purchase_record_mode = 'create' then
        if p_purchase_category_id is null then raise exception 'Pilih kategori pengeluaran untuk pembelian'; end if;
        select type into v_category_type from public.categories
          where id = p_purchase_category_id and user_id = v_user_id;
        if v_category_type is distinct from 'expense' then raise exception 'Kategori pembelian harus kategori pengeluaran milik akunmu'; end if;

        insert into public.transactions (
            user_id, wallet_id, type, category_id, amount, description, transaction_date, transaction_time
        ) values (
            v_user_id, null, 'expense', p_purchase_category_id, round(p_principal_amount, 2),
            'Pembelian kredit: ' || btrim(p_description), p_purchase_date, time '12:00:00'
        ) returning id into v_transaction_id;
    elsif p_purchase_record_mode = 'link' then
        if p_existing_transaction_id is null then raise exception 'Pilih transaksi pembelian yang sudah tercatat'; end if;
        select type, amount into v_existing_type, v_existing_amount
          from public.transactions
          where id = p_existing_transaction_id and user_id = v_user_id
          for share;
        if not found or v_existing_type <> 'expense' then raise exception 'Transaksi yang ditautkan harus pengeluaran milik akunmu'; end if;
        if round(v_existing_amount::numeric, 2) <> round(p_principal_amount, 2) then
            raise exception 'Nominal transaksi yang ditautkan harus sama dengan pokok pembelian';
        end if;
        v_transaction_id := p_existing_transaction_id;
    else
        v_transaction_id := null;
    end if;

    insert into public.credit_plans (
        user_id, credit_account_id, transaction_id, description, principal_amount,
        interest_type, interest_total, fee_total, tenor_months, start_date, status
    ) values (
        v_user_id, p_credit_account_id, v_transaction_id, btrim(p_description), round(p_principal_amount, 2),
        p_interest_type, round(p_interest_total, 2), round(p_fee_total, 2), p_tenor_months, p_purchase_date,
        case when p_paid_installments = p_tenor_months then 'completed' else 'active' end
    ) returning id into v_plan_id;

    v_total_principal_cents := round(p_principal_amount * 100)::bigint;
    v_total_interest_cents := round(p_interest_total * 100)::bigint;
    v_total_fee_cents := round(p_fee_total * 100)::bigint;

    for v_i in 1..p_tenor_months loop
        v_principal_cents := (v_total_principal_cents / p_tenor_months)
            + case when v_i <= mod(v_total_principal_cents, p_tenor_months) then 1 else 0 end;
        v_interest_cents := (v_total_interest_cents / p_tenor_months)
            + case when v_i <= mod(v_total_interest_cents, p_tenor_months) then 1 else 0 end;
        v_fee_cents := (v_total_fee_cents / p_tenor_months)
            + case when v_i <= mod(v_total_fee_cents, p_tenor_months) then 1 else 0 end;

        v_due_month := (date_trunc('month', p_first_due_date::timestamp) + make_interval(months => v_i - 1))::date;
        v_next_month := (v_due_month + interval '1 month')::date;
        v_day := least(
            extract(day from p_first_due_date)::integer,
            extract(day from (v_next_month - 1))::integer
        );
        v_due_date := v_due_month + (v_day - 1);

        insert into public.credit_installments (
            user_id, credit_plan_id, installment_number, due_date,
            principal_due, interest_due, fee_due,
            principal_paid, interest_paid, fee_paid, status
        ) values (
            v_user_id, v_plan_id, v_i, v_due_date,
            v_principal_cents / 100.0, v_interest_cents / 100.0, v_fee_cents / 100.0,
            case when v_i <= p_paid_installments then v_principal_cents / 100.0 else 0 end,
            case when v_i <= p_paid_installments then v_interest_cents / 100.0 else 0 end,
            case when v_i <= p_paid_installments then v_fee_cents / 100.0 else 0 end,
            case when v_i <= p_paid_installments then 'paid' else 'unpaid' end
        );
    end loop;

    return v_plan_id;
end;
$$;

create or replace function public.record_credit_installment_payment(
    p_installment_id uuid,
    p_wallet_id uuid,
    p_principal_amount numeric,
    p_interest_amount numeric,
    p_fee_amount numeric,
    p_paid_at timestamptz,
    p_expense_category_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_installment public.credit_installments%rowtype;
    v_plan public.credit_plans%rowtype;
    v_payment_id uuid;
    v_transaction_id uuid;
    v_category_type text;
    v_principal_remaining numeric;
    v_interest_remaining numeric;
    v_fee_remaining numeric;
    v_total numeric;
    v_expense_total numeric;
begin
    if v_user_id is null then raise exception 'Authentication required'; end if;
    if p_paid_at is null then raise exception 'Tanggal pembayaran wajib diisi'; end if;
    if coalesce(p_principal_amount, -1) < 0 or coalesce(p_interest_amount, -1) < 0 or coalesce(p_fee_amount, -1) < 0 then
        raise exception 'Nominal pembayaran tidak boleh negatif';
    end if;
    v_total := round(p_principal_amount + p_interest_amount + p_fee_amount, 2);
    v_expense_total := round(p_interest_amount + p_fee_amount, 2);
    if v_total <= 0 then raise exception 'Nominal pembayaran harus lebih dari nol'; end if;

    select * into v_installment
      from public.credit_installments
      where id = p_installment_id and user_id = v_user_id
      for update;
    if not found then raise exception 'Jadwal cicilan tidak ditemukan'; end if;
    if v_installment.status in ('paid', 'cancelled') then raise exception 'Cicilan ini sudah lunas atau dibatalkan'; end if;

    select * into v_plan from public.credit_plans
      where id = v_installment.credit_plan_id and user_id = v_user_id
      for update;
    if not found then raise exception 'Rencana cicilan tidak ditemukan'; end if;

    v_principal_remaining := round(v_installment.principal_due - v_installment.principal_paid, 2);
    v_interest_remaining := round(v_installment.interest_due - v_installment.interest_paid, 2);
    v_fee_remaining := round(v_installment.fee_due - v_installment.fee_paid, 2);
    if p_principal_amount > v_principal_remaining
       or p_interest_amount > v_interest_remaining
       or p_fee_amount > v_fee_remaining then
        raise exception 'Pembayaran melebihi sisa nominal pada cicilan ini';
    end if;

    perform 1 from public.wallets where id = p_wallet_id and user_id = v_user_id for share;
    if not found then raise exception 'Pilih dompet milik akunmu'; end if;

    if v_expense_total > 0 then
        if p_expense_category_id is null then raise exception 'Pilih kategori pengeluaran untuk bunga/biaya'; end if;
        select type into v_category_type from public.categories
          where id = p_expense_category_id and user_id = v_user_id;
        if v_category_type is distinct from 'expense' then raise exception 'Kategori bunga/biaya harus kategori pengeluaran'; end if;
        insert into public.transactions (
            user_id, wallet_id, type, category_id, amount, description, transaction_date, transaction_time
        ) values (
            v_user_id, p_wallet_id, 'expense', p_expense_category_id, v_expense_total,
            'Bunga/biaya cicilan: ' || v_plan.description || ' (' || v_installment.installment_number || '/' || v_plan.tenor_months || ')',
            p_paid_at::date, p_paid_at::time
        ) returning id into v_transaction_id;
    end if;

    insert into public.credit_payments (
        user_id, credit_account_id, wallet_id, paid_at, amount,
        principal_amount, interest_amount, fee_amount, transaction_id, notes
    ) values (
        v_user_id, v_plan.credit_account_id, p_wallet_id, p_paid_at, v_total,
        round(p_principal_amount, 2), round(p_interest_amount, 2), round(p_fee_amount, 2),
        v_transaction_id, 'Pembayaran cicilan ' || v_installment.installment_number || '/' || v_plan.tenor_months
    ) returning id into v_payment_id;

    insert into public.credit_payment_allocations (
        user_id, credit_payment_id, credit_installment_id,
        principal_paid, interest_paid, fee_paid
    ) values (
        v_user_id, v_payment_id, v_installment.id,
        round(p_principal_amount, 2), round(p_interest_amount, 2), round(p_fee_amount, 2)
    );

    update public.credit_installments
       set principal_paid = round(principal_paid + p_principal_amount, 2),
           interest_paid = round(interest_paid + p_interest_amount, 2),
           fee_paid = round(fee_paid + p_fee_amount, 2),
           status = case
             when round(principal_paid + p_principal_amount, 2) >= principal_due
              and round(interest_paid + p_interest_amount, 2) >= interest_due
              and round(fee_paid + p_fee_amount, 2) >= fee_due then 'paid'
             else 'partial'
           end,
           updated_at = now()
     where id = v_installment.id;

    if not exists (
        select 1 from public.credit_installments
         where credit_plan_id = v_plan.id and status in ('unpaid', 'partial')
    ) then
        update public.credit_plans set status = 'completed', updated_at = now() where id = v_plan.id;
    end if;

    return v_payment_id;
end;
$$;

revoke all on function public.create_credit_plan_with_schedule(uuid,text,numeric,text,numeric,numeric,integer,date,date,text,uuid,uuid,integer) from public, anon;
revoke all on function public.record_credit_installment_payment(uuid,uuid,numeric,numeric,numeric,timestamptz,uuid) from public, anon;
grant execute on function public.create_credit_plan_with_schedule(uuid,text,numeric,text,numeric,numeric,integer,date,date,text,uuid,uuid,integer) to authenticated;
grant execute on function public.record_credit_installment_payment(uuid,uuid,numeric,numeric,numeric,timestamptz,uuid) to authenticated;

commit;
