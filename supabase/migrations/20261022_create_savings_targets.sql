BEGIN;

CREATE TABLE IF NOT EXISTS public.savings_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
    target_amount numeric(14,2) NULL CHECK (target_amount IS NULL OR target_amount > 0),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS public.savings_target_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id uuid NOT NULL REFERENCES public.savings_targets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id uuid NULL,
    movement_type text NOT NULL CHECK (movement_type IN ('deposit', 'return', 'spend')),
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    description text NULL,
    movement_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT savings_target_movements_wallet_user_fk
        FOREIGN KEY (wallet_id, user_id)
        REFERENCES public.wallets(id, user_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS savings_targets_user_status_idx
    ON public.savings_targets(user_id, status, created_at);

CREATE INDEX IF NOT EXISTS savings_target_movements_target_date_idx
    ON public.savings_target_movements(target_id, movement_date, created_at);

ALTER TABLE public.savings_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_target_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own savings targets" ON public.savings_targets;
CREATE POLICY "Users manage their own savings targets"
    ON public.savings_targets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own savings target movements" ON public.savings_target_movements;
CREATE POLICY "Users manage their own savings target movements"
    ON public.savings_target_movements
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMIT;
