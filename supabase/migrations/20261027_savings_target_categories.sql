-- Dedicated category for savings targets, separate from transaction categories.
alter table public.savings_targets add column if not exists category text not null default 'Lainnya';
alter table public.savings_targets drop constraint if exists savings_targets_category_check;
alter table public.savings_targets add constraint savings_targets_category_check check (category in ('Pernikahan','Liburan','Dana darurat','Rumah & kendaraan','Pendidikan','Gadget & hobi','Keluarga','Lainnya'));
