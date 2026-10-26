-- Pockito: Cicilan & Kredit foundation
-- Apply manually in Supabase SQL Editor after reviewing docs/CREDIT_AND_INSTALLMENTS.md.
-- This migration creates new tables only; it does not modify existing transactions or wallets.

begin;

-- Composite unique indexes allow ownership-preserving foreign keys.
create unique index if not exists transactions_id_user_id_uidx
    on public.transactions (id, user_id);

create unique index if not exists wallets_id_user_id_uidx
    on public.wallets (id, user_id);

create table if not exists public.credit_accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (length(btrim(name)) between 1 and 80),
    provider text check (provider is null or length(provider) <= 80),
    account_type text not null check (account_type in ('credit_card', 'paylater', 'installment_loan', 'other')),
    credit_limit numeric(14,2) check (credit_limit is null or credit_limit >= 0),
    billing_day smallint check (billing_day is null or billing_day between 1 and 31),
    due_day smallint check (due_day is null or due_day between 1 and 31),
    is_active boolean not null default true,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id)
);

create table if not exists public.credit_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    credit_account_id uuid not null,
    transaction_id uuid,
    description text not null check (length(btrim(description)) between 1 and 160),
    principal_amount numeric(14,2) not null check (principal_amount > 0),
    interest_type text not null default 'none' check (interest_type in ('none', 'fixed', 'variable')),
    interest_total numeric(14,2) not null default 0 check (interest_total >= 0),
    fee_total numeric(14,2) not null default 0 check (fee_total >= 0),
    tenor_months smallint not null check (tenor_months between 1 and 600),
    start_date date not null default current_date,
    status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id),
    constraint credit_plans_account_owner_fk
        foreign key (credit_account_id, user_id)
        references public.credit_accounts (id, user_id) on delete restrict,
    constraint credit_plans_transaction_owner_fk
        foreign key (transaction_id, user_id)
        references public.transactions (id, user_id) on delete set null (transaction_id)
);

create table if not exists public.credit_installments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    credit_plan_id uuid not null,
    installment_number smallint not null check (installment_number >= 1),
    due_date date not null,
    principal_due numeric(14,2) not null default 0 check (principal_due >= 0),
    interest_due numeric(14,2) not null default 0 check (interest_due >= 0),
    fee_due numeric(14,2) not null default 0 check (fee_due >= 0),
    principal_paid numeric(14,2) not null default 0 check (principal_paid >= 0),
    interest_paid numeric(14,2) not null default 0 check (interest_paid >= 0),
    fee_paid numeric(14,2) not null default 0 check (fee_paid >= 0),
    status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (credit_plan_id, installment_number),
    unique (id, user_id),
    constraint credit_installments_plan_owner_fk
        foreign key (credit_plan_id, user_id)
        references public.credit_plans (id, user_id) on delete restrict,
    constraint credit_installments_paid_not_overdue_fk
        check (
            principal_paid <= principal_due
            and interest_paid <= interest_due
            and fee_paid <= fee_due
        )
);

create table if not exists public.credit_bills (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    credit_account_id uuid not null,
    period_start date not null,
    period_end date not null,
    statement_date date,
    due_date date not null,
    total_due numeric(14,2) not null check (total_due >= 0),
    minimum_due numeric(14,2) check (minimum_due is null or (minimum_due >= 0 and minimum_due <= total_due)),
    paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0 and paid_amount <= total_due),
    status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
    source text not null default 'manual' check (source in ('manual', 'statement', 'generated')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id),
    unique (credit_account_id, period_start, period_end),
    constraint credit_bills_period_valid check (period_end >= period_start),
    constraint credit_bills_account_owner_fk
        foreign key (credit_account_id, user_id)
        references public.credit_accounts (id, user_id) on delete restrict
);

create table if not exists public.credit_payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    credit_account_id uuid not null,
    wallet_id uuid not null,
    paid_at timestamptz not null default now(),
    amount numeric(14,2) not null check (amount > 0),
    principal_amount numeric(14,2) not null default 0 check (principal_amount >= 0),
    interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
    fee_amount numeric(14,2) not null default 0 check (fee_amount >= 0),
    transaction_id uuid,
    reference text,
    notes text,
    created_at timestamptz not null default now(),
    unique (id, user_id),
    constraint credit_payments_amount_breakdown_ck
        check (amount = principal_amount + interest_amount + fee_amount),
    constraint credit_payments_account_owner_fk
        foreign key (credit_account_id, user_id)
        references public.credit_accounts (id, user_id) on delete restrict,
    constraint credit_payments_wallet_owner_fk
        foreign key (wallet_id, user_id)
        references public.wallets (id, user_id) on delete restrict,
    constraint credit_payments_transaction_owner_fk
        foreign key (transaction_id, user_id)
        references public.transactions (id, user_id) on delete set null (transaction_id)
);

create table if not exists public.credit_payment_allocations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    credit_payment_id uuid not null,
    credit_bill_id uuid,
    credit_installment_id uuid,
    principal_paid numeric(14,2) not null default 0 check (principal_paid >= 0),
    interest_paid numeric(14,2) not null default 0 check (interest_paid >= 0),
    fee_paid numeric(14,2) not null default 0 check (fee_paid >= 0),
    created_at timestamptz not null default now(),
    constraint credit_payment_allocations_exactly_one_target_ck
        check (num_nonnulls(credit_bill_id, credit_installment_id) = 1),
    constraint credit_payment_allocations_payment_owner_fk
        foreign key (credit_payment_id, user_id)
        references public.credit_payments (id, user_id) on delete cascade,
    constraint credit_payment_allocations_bill_owner_fk
        foreign key (credit_bill_id, user_id)
        references public.credit_bills (id, user_id) on delete restrict,
    constraint credit_payment_allocations_installment_owner_fk
        foreign key (credit_installment_id, user_id)
        references public.credit_installments (id, user_id) on delete restrict
);

create index if not exists credit_accounts_user_active_idx
    on public.credit_accounts (user_id, is_active, created_at desc);
create index if not exists credit_plans_user_account_idx
    on public.credit_plans (user_id, credit_account_id, status);
create index if not exists credit_installments_user_due_idx
    on public.credit_installments (user_id, due_date, status);
create index if not exists credit_bills_user_due_idx
    on public.credit_bills (user_id, due_date, status);
create index if not exists credit_payments_user_paid_at_idx
    on public.credit_payments (user_id, paid_at desc);
create index if not exists credit_payment_allocations_user_payment_idx
    on public.credit_payment_allocations (user_id, credit_payment_id);

alter table public.credit_accounts enable row level security;
alter table public.credit_plans enable row level security;
alter table public.credit_installments enable row level security;
alter table public.credit_bills enable row level security;
alter table public.credit_payments enable row level security;
alter table public.credit_payment_allocations enable row level security;

drop policy if exists credit_accounts_owner_only on public.credit_accounts;
create policy credit_accounts_owner_only on public.credit_accounts
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists credit_plans_owner_only on public.credit_plans;
create policy credit_plans_owner_only on public.credit_plans
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists credit_installments_owner_only on public.credit_installments;
create policy credit_installments_owner_only on public.credit_installments
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists credit_bills_owner_only on public.credit_bills;
create policy credit_bills_owner_only on public.credit_bills
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists credit_payments_owner_only on public.credit_payments;
create policy credit_payments_owner_only on public.credit_payments
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists credit_payment_allocations_owner_only on public.credit_payment_allocations;
create policy credit_payment_allocations_owner_only on public.credit_payment_allocations
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

grant select, insert, update, delete on
    public.credit_accounts,
    public.credit_plans,
    public.credit_installments,
    public.credit_bills,
    public.credit_payments,
    public.credit_payment_allocations
to authenticated;

commit;
