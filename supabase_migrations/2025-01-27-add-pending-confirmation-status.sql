-- Migration: Add pending_confirmation status for reports
-- This migration adds support for the 'pending_confirmation' status
-- which is used for resident/guest reports awaiting official confirmation
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
--
-- This will:
-- - Normalize existing 'Pending Confirmation' status values to 'pending_confirmation'
-- - Update the status check constraint to include 'pending_confirmation'

-- Step 1: Normalize existing status values
-- Update any existing rows with 'Pending Confirmation' or 'pending confirmation' to 'pending_confirmation'
UPDATE reports
SET status = 'pending_confirmation'
WHERE status IN ('Pending Confirmation', 'pending confirmation');

-- Step 2: Replace status check constraint to include pending_confirmation
-- Drop the existing constraint if it exists
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_status_check;

-- Add the new constraint with pending_confirmation included
ALTER TABLE reports
ADD CONSTRAINT reports_status_check
CHECK (status IN ('open', 'investigating', 'resolved', 'pending_confirmation'));

-- Verification query (uncomment to check results):
-- SELECT status, COUNT(*) as count FROM reports GROUP BY status ORDER BY count DESC;
