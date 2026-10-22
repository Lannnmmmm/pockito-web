-- Pockito migration: make transaction wallet optional.
-- Safe to run in Supabase SQL Editor after reviewing the change.
-- Existing transactions and wallet rows are preserved.
-- The existing foreign keys remain in place; wallet ownership is still checked
-- whenever wallet_id is provided.

BEGIN;

ALTER TABLE public.transactions
    ALTER COLUMN wallet_id DROP NOT NULL;

COMMIT;
