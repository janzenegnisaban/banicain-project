-- ============================================================================
-- Mock Data for Crime Pattern Analytics
-- ============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute
--
-- This script will insert 35 mock crime reports with:
--   - Various crime types (Theft, Assault, Fraud, Vandalism, Burglary)
--   - Different locations (Downtown District, Industrial Zone, Residential Area)
--   - Different statuses (open, in_progress, investigating, closed, resolved)
--   - Dates spread across the last 6 months
--   - Report updates for solved cases to calculate response times
--
-- IMPORTANT NOTES:
-- - The script creates a test user first (if needed) for reporter_id
-- - Status values: 'open', 'in_progress', 'investigating', 'closed', 'resolved'
-- - Priority values: 'low', 'medium', 'high', 'critical'
-- - The 'date' column uses hardcoded dates (2024-XX-XX format). If you want
--   current year dates, do a find-replace: '2024-' with '2025-' (or current year)
-- - The created_at and updated_at timestamps use CURRENT_TIMESTAMP with intervals,
--   so they automatically adjust to the last 6 months relative to when you run this
-- - If you want to clear existing mock data first, uncomment the DELETE
--   statements at the top
-- - The reports will appear in your analytics dashboard immediately after running
-- - All reports have "Mock -" prefix in the title for easy identification
--
-- ============================================================================

-- First, create a test user for reporter_id (if it doesn't exist)
-- You can skip this if you already have users in your database
INSERT INTO users (id, email, full_name, role, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'mock.reporter@test.com', 'Mock Reporter', 'resident', true)
ON CONFLICT (email) DO NOTHING;

-- Clear existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM report_updates WHERE report_id IN (SELECT id FROM reports WHERE title LIKE 'Mock%');
-- DELETE FROM reports WHERE title LIKE 'Mock%';

-- Insert mock reports with various crime types, locations, and dates spread across 6 months
-- Note: Using gen_random_uuid() for IDs, but you can also use specific IDs if needed

INSERT INTO reports (
  id, reporter_id, report_type, title, type, status, priority, 
  location, location_name, date, time, officer, 
  description, damage, notes, evidence, suspects, victims, 
  created_at, updated_at
) VALUES

-- January 2024 - Theft cases
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft at Downtown Mall', 'Theft', 'resolved', 'high', 
 'Downtown District', 'Downtown District', '2024-01-15', '14:30', 'Officer Smith', 
 'Reported theft of personal belongings from shopping mall', 'Property loss: $500', 'Case closed successfully', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '5 months', CURRENT_TIMESTAMP - INTERVAL '5 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vehicle Theft', 'Theft', 'resolved', 'critical', 
 'Industrial Zone', 'Industrial Zone', '2024-01-20', '08:45', 'Officer Johnson', 
 'Vehicle stolen from parking lot', 'Vehicle value: $15,000', 'Vehicle recovered', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '5 months', CURRENT_TIMESTAMP - INTERVAL '5 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Incident', 'Assault', 'investigating', 'high', 
 'Residential Area', 'Residential Area', '2024-01-25', '19:20', 'Officer Brown', 
 'Physical assault reported in residential neighborhood', 'Minor injuries', 'Investigation ongoing', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '5 months', CURRENT_TIMESTAMP - INTERVAL '5 months'),

-- February 2024
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Case', 'Fraud', 'resolved', 'medium', 
 'Downtown District', 'Downtown District', '2024-02-05', '11:15', 'Officer Davis', 
 'Credit card fraud reported', 'Financial loss: $2,000', 'Suspect identified', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '4 months', CURRENT_TIMESTAMP - INTERVAL '4 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism at Park', 'Vandalism', 'resolved', 'low', 
 'Residential Area', 'Residential Area', '2024-02-12', '16:45', 'Officer Wilson', 
 'Graffiti and property damage at public park', 'Property damage: $300', 'Cleaned and case closed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '4 months', CURRENT_TIMESTAMP - INTERVAL '4 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Burglary Report', 'Burglary', 'resolved', 'high', 
 'Industrial Zone', 'Industrial Zone', '2024-02-18', '22:30', 'Officer Martinez', 
 'Break-in at warehouse facility', 'Stolen equipment: $5,000', 'Suspects apprehended', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '4 months', CURRENT_TIMESTAMP - INTERVAL '4 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft from Store', 'Theft', 'resolved', 'medium', 
 'Downtown District', 'Downtown District', '2024-02-22', '15:20', 'Officer Taylor', 
 'Shoplifting incident at retail store', 'Merchandise value: $150', 'Case resolved', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '4 months', CURRENT_TIMESTAMP - INTERVAL '4 months'),

-- March 2024
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Case', 'Assault', 'resolved', 'high', 
 'Downtown District', 'Downtown District', '2024-03-08', '20:15', 'Officer Anderson', 
 'Physical altercation at bar', 'Injuries reported', 'Case closed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '3 months', CURRENT_TIMESTAMP - INTERVAL '3 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Investigation', 'Fraud', 'investigating', 'medium', 
 'Residential Area', 'Residential Area', '2024-03-15', '10:00', 'Officer White', 
 'Online scam reported', 'Financial loss: $1,500', 'Investigation in progress', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '3 months', CURRENT_TIMESTAMP - INTERVAL '3 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism Incident', 'Vandalism', 'resolved', 'low', 
 'Industrial Zone', 'Industrial Zone', '2024-03-20', '18:00', 'Officer Harris', 
 'Property damage to business', 'Damage cost: $800', 'Repairs completed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '3 months', CURRENT_TIMESTAMP - INTERVAL '3 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Report', 'Theft', 'resolved', 'high', 
 'Downtown District', 'Downtown District', '2024-03-25', '12:30', 'Officer Clark', 
 'Bicycle theft from public area', 'Bicycle value: $400', 'Recovered', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '3 months', CURRENT_TIMESTAMP - INTERVAL '3 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Burglary Case', 'Burglary', 'resolved', 'critical', 
 'Residential Area', 'Residential Area', '2024-03-28', '23:45', 'Officer Lewis', 
 'Home break-in reported', 'Stolen items: $3,000', 'Suspect arrested', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '3 months', CURRENT_TIMESTAMP - INTERVAL '3 months'),

-- April 2024
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Report', 'Assault', 'open', 'high', 
 'Industrial Zone', 'Industrial Zone', '2024-04-05', '17:20', NULL, 
 'Workplace altercation', 'Minor injuries', 'Awaiting investigation', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP - INTERVAL '2 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Case', 'Theft', 'resolved', 'medium', 
 'Downtown District', 'Downtown District', '2024-04-10', '14:00', 'Officer Walker', 
 'Pickpocket incident', 'Cash and wallet stolen', 'Case resolved', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP - INTERVAL '2 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Report', 'Fraud', 'resolved', 'medium', 
 'Residential Area', 'Residential Area', '2024-04-15', '11:45', 'Officer Hall', 
 'Identity theft case', 'Personal information compromised', 'Identity restored', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP - INTERVAL '2 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism Report', 'Vandalism', 'resolved', 'low', 
 'Downtown District', 'Downtown District', '2024-04-20', '19:30', 'Officer Allen', 
 'Graffiti on public building', 'Cleaning cost: $200', 'Removed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP - INTERVAL '2 months'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Burglary Investigation', 'Burglary', 'investigating', 'high', 
 'Industrial Zone', 'Industrial Zone', '2024-04-25', '06:00', 'Officer Young', 
 'Warehouse break-in', 'Equipment stolen: $8,000', 'Active investigation', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '2 months', CURRENT_TIMESTAMP - INTERVAL '2 months'),

-- May 2024
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Incident', 'Theft', 'resolved', 'high', 
 'Downtown District', 'Downtown District', '2024-05-03', '13:15', 'Officer King', 
 'Package theft from doorstep', 'Package value: $250', 'Resolved', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Case', 'Assault', 'resolved', 'critical', 
 'Residential Area', 'Residential Area', '2024-05-08', '21:00', 'Officer Wright', 
 'Domestic dispute', 'Injuries sustained', 'Case closed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Case', 'Fraud', 'open', 'medium', 
 'Industrial Zone', 'Industrial Zone', '2024-05-12', '10:30', NULL, 
 'Business email compromise', 'Financial loss: $5,000', 'Pending review', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism Report', 'Vandalism', 'resolved', 'low', 
 'Downtown District', 'Downtown District', '2024-05-18', '16:00', 'Officer Lopez', 
 'Property damage to vehicle', 'Repair cost: $600', 'Fixed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Burglary Report', 'Burglary', 'resolved', 'high', 
 'Residential Area', 'Residential Area', '2024-05-22', '02:30', 'Officer Hill', 
 'Home invasion', 'Stolen electronics: $4,500', 'Suspects identified', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Report', 'Theft', 'investigating', 'medium', 
 'Industrial Zone', 'Industrial Zone', '2024-05-28', '15:45', 'Officer Scott', 
 'Equipment theft from construction site', 'Equipment value: $2,500', 'Investigation ongoing', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP - INTERVAL '1 month', CURRENT_TIMESTAMP - INTERVAL '1 month'),

-- June 2024 (Current month - more recent cases)
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Case', 'Theft', 'resolved', 'high', 
 'Downtown District', 'Downtown District', '2024-06-02', '11:20', 'Officer Green', 
 'Jewelry theft from store', 'Jewelry value: $3,000', 'Recovered', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Report', 'Assault', 'open', 'high', 
 'Residential Area', 'Residential Area', '2024-06-05', '19:45', NULL, 
 'Street altercation', 'Injuries reported', 'Awaiting assignment', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Investigation', 'Fraud', 'investigating', 'medium', 
 'Downtown District', 'Downtown District', '2024-06-08', '09:15', 'Officer Adams', 
 'Bank fraud case', 'Unauthorized transactions: $1,200', 'Investigation active', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism Case', 'Vandalism', 'resolved', 'low', 
 'Industrial Zone', 'Industrial Zone', '2024-06-12', '14:00', 'Officer Baker', 
 'Property damage to business sign', 'Repair cost: $400', 'Restored', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Burglary Report', 'Burglary', 'resolved', 'critical', 
 'Residential Area', 'Residential Area', '2024-06-15', '23:00', 'Officer Nelson', 
 'Apartment break-in', 'Stolen items: $2,800', 'Case closed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Theft Incident', 'Theft', 'resolved', 'medium', 
 'Downtown District', 'Downtown District', '2024-06-20', '16:30', 'Officer Carter', 
 'Wallet theft', 'Cash and cards stolen', 'Resolved', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Assault Case', 'Assault', 'investigating', 'high', 
 'Industrial Zone', 'Industrial Zone', '2024-06-22', '18:15', 'Officer Mitchell', 
 'Workplace violence', 'Employee injured', 'Investigation ongoing', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Fraud Report', 'Fraud', 'open', 'medium', 
 'Residential Area', 'Residential Area', '2024-06-25', '12:45', NULL, 
 'Phone scam reported', 'Attempted fraud: $800', 'Pending review', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'crime', 'Mock - Vandalism Report', 'Vandalism', 'resolved', 'low', 
 'Downtown District', 'Downtown District', '2024-06-28', '20:00', 'Officer Perez', 
 'Graffiti on public property', 'Cleaning cost: $150', 'Removed', 
 ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Now insert report updates for resolved cases to track status changes
-- This helps calculate response times in analytics

INSERT INTO report_updates (report_id, updated_by, update_type, comment, status_change_from, status_change_to, created_at)
SELECT 
  r.id,
  '00000000-0000-0000-0000-000000000001',
  'status_change',
  'Status changed to ' || r.status,
  'open',
  r.status,
  r.created_at + INTERVAL '2 days'
FROM reports r
WHERE r.title LIKE 'Mock%' 
  AND r.status = 'resolved'
  AND r.created_at < CURRENT_TIMESTAMP - INTERVAL '1 day';

-- Summary of inserted data:
-- Total Reports: 35
-- Crime Types Distribution:
--   - Theft: 12 cases
--   - Assault: 6 cases
--   - Fraud: 7 cases
--   - Vandalism: 6 cases
--   - Burglary: 4 cases
-- Status Distribution:
--   - resolved: ~25 cases (71%)
--   - investigating: ~6 cases (17%)
--   - open: ~4 cases (12%)
-- Location Distribution:
--   - Downtown District: ~15 cases (most frequent)
--   - Residential Area: ~10 cases
--   - Industrial Zone: ~10 cases
-- Date Range: Last 6 months (January - June 2024)
