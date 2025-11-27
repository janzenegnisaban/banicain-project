-- Migration: Cleanup Unused Tables
-- This migration removes tables that are not being used in the application
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
--
-- WARNING: This will permanently delete the following tables and all their data:
-- - location_pins (not used anywhere in the codebase)
-- - profiles (not used anywhere in the codebase)
-- - statistics (not used anywhere in the codebase)
--
-- Make sure you have a backup if you need to restore this data later

-- Step 1: Drop location_pins table (if it exists)
-- This table has foreign keys, so we need to drop them first
DROP TABLE IF EXISTS public.location_pins CASCADE;

-- Step 2: Drop profiles table (if it exists)
-- This table has foreign keys, so we need to drop them first
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 3: Drop statistics table (if it exists)
-- This table has no foreign keys, safe to drop directly
DROP TABLE IF EXISTS public.statistics CASCADE;

-- Verification queries (uncomment to check results):
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('location_pins', 'profiles', 'statistics');
-- Should return no rows if cleanup was successful

-- Expected remaining tables:
-- - reports (main table - USED)
-- - users (user management - USED)
-- - report_updates (report history - USED)

