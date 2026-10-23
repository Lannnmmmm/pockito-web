BEGIN;

ALTER TABLE public.savings_targets
    ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🐷';

COMMIT;
