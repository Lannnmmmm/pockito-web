BEGIN;

ALTER TABLE public.wallets
    ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'bank',
    ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#DDF5E7';

UPDATE public.wallets
SET icon = COALESCE(NULLIF(icon, ''), 'bank'),
    color = COALESCE(NULLIF(color, ''), '#DDF5E7')
WHERE icon IS NULL OR color IS NULL OR icon = '' OR color = '';

COMMIT;
