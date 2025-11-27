-- Migration: Add Short Report IDs
-- This migration adds a short_id column to the reports table and generates
-- short IDs for all existing reports. Format: RPT-XXXXXX (6 alphanumeric chars)
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
--
-- This will:
-- - Add a `short_id` column to the reports table
-- - Generate unique short IDs for all existing reports
-- - Create a function to auto-generate short IDs for new reports
-- - Add a trigger to automatically assign short IDs to new reports
-- - Create an index on short_id for fast lookups

-- Step 1: Add short_id column
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Step 2: Create function to generate short IDs
CREATE OR REPLACE FUNCTION generate_short_report_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars (0, O, I, 1)
  result TEXT := 'RPT-';
  i INTEGER;
  random_char TEXT;
BEGIN
  -- Generate 6 random characters
  FOR i IN 1..6 LOOP
    random_char := SUBSTRING(chars FROM floor(random() * length(chars) + 1)::INTEGER FOR 1);
    result := result || random_char;
  END LOOP;
  
  -- Check if this ID already exists (very unlikely but possible)
  WHILE EXISTS (SELECT 1 FROM public.reports WHERE short_id = result) LOOP
    result := 'RPT-';
    FOR i IN 1..6 LOOP
      random_char := SUBSTRING(chars FROM floor(random() * length(chars) + 1)::INTEGER FOR 1);
      result := result || random_char;
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Generate short IDs for all existing reports
DO $$
DECLARE
  report_record RECORD;
  new_short_id TEXT;
BEGIN
  FOR report_record IN SELECT id FROM public.reports WHERE short_id IS NULL LOOP
    new_short_id := generate_short_report_id();
    
    -- Ensure uniqueness (handle edge case of collision)
    WHILE EXISTS (SELECT 1 FROM public.reports WHERE short_id = new_short_id) LOOP
      new_short_id := generate_short_report_id();
    END LOOP;
    
    UPDATE public.reports 
    SET short_id = new_short_id 
    WHERE id = report_record.id;
  END LOOP;
END $$;

-- Step 4: Make short_id NOT NULL and UNIQUE
ALTER TABLE public.reports 
ALTER COLUMN short_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reports_short_id_idx ON public.reports(short_id);

-- Step 5: Create trigger function to auto-assign short_id for new reports
CREATE OR REPLACE FUNCTION assign_short_report_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := generate_short_report_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to auto-assign short_id on insert
DROP TRIGGER IF EXISTS trigger_assign_short_report_id ON public.reports;
CREATE TRIGGER trigger_assign_short_report_id
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION assign_short_report_id();

-- Step 7: Add comment for documentation
COMMENT ON COLUMN public.reports.short_id IS 'Short, human-readable report identifier (format: RPT-XXXXXX)';

-- Verification query (uncomment to check results):
-- SELECT id, short_id, title FROM public.reports ORDER BY created_at DESC LIMIT 10;

