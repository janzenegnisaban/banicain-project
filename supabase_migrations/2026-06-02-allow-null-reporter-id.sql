-- Allow guest incident reports without a linked user account
ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;
