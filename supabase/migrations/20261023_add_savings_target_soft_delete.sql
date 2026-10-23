BEGIN;

-- Soft delete keeps movement history intact so wallet balances remain accurate.
ALTER TABLE public.savings_targets
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS savings_targets_user_deleted_at_idx
    ON public.savings_targets (user_id, deleted_at);

COMMIT;
