# Supabase Setup Guide

To connect your application to Supabase, you need to set up your environment variables.

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (this is your `SUPABASE_URL` or `PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `PUBLIC_SUPABASE_ANON_KEY` - for client-side operations)
   - **service_role key** (this is your `SUPABASE_KEY` - for server-side admin operations)

**Important:** 
- The **anon key** is safe to expose in client-side code
- The **service_role key** has admin privileges and should NEVER be exposed in client-side code
- The service_role key is required for operations like creating users via `supabase.auth.admin.createUser()`

## Step 2: Create Environment File

Create a `.env` file in the root of your project (same directory as `package.json`) with the following:

```env
# Required for server-side admin operations (creating users, etc.)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key-here

# Required for client-side operations
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# For Prisma (if using Prisma migrations)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
```

**Note:** 
- `SUPABASE_KEY` should be the **service_role key** (found in Settings → API → service_role key)
- `PUBLIC_SUPABASE_ANON_KEY` should be the **anon/public key** (found in Settings → API → anon public key)
- Both keys are needed: service_role for admin operations, anon key for client-side operations

**Note:** 
- Replace `[YOUR-PASSWORD]` with your Supabase database password
- Replace `[YOUR-PROJECT-ID]` with your Supabase project ID
- The `DATABASE_URL` uses the connection pooler (pgbouncer)
- The `DIRECT_URL` is for direct database connections (needed for migrations)
- You can find these connection strings in Supabase Dashboard → Settings → Database → Connection string

## Step 3: Restart Your Development Server

After creating/updating the `.env` file:
1. Stop your current server (Ctrl+C)
2. Restart it with `bun run dev` or `npm run dev`

## Step 4: Verify Connection

1. Try creating a new report
2. Check the terminal/console for logs like:
   - `[Database] Inserting report into Supabase: CR-...`
   - `[Database] Successfully inserted report: CR-...`
3. Check your Supabase dashboard → Table Editor → `reports` table to see if the report appears

## Troubleshooting

### Error: "SUPABASE_URL is required"
- Make sure your `.env` file is in the root directory
- Check that the variable names match exactly (case-sensitive)
- Restart your dev server after creating/updating `.env`

### Error: "Failed to persist report to Supabase"
- Check that your Supabase project is active
- Verify your API key has the correct permissions
- Check the browser console and terminal for detailed error messages
- Make sure your database schema matches (see `supabase_mock_data.sql` for reference)

### Error: "User not allowed" or "not_admin" when creating users
- This means `SUPABASE_KEY` (service_role key) is not set or incorrect
- Go to Supabase Dashboard → Settings → API
- Copy the **service_role key** (not the anon key)
- Set it as `SUPABASE_KEY` in your `.env` file
- Restart your dev server
- **Note:** Without the service_role key, users can still be created in `public.users` table, but they won't have auth accounts (can't log in)

### Reports not showing in database
- Check Supabase Dashboard → Table Editor → `reports` table
- Verify the table exists and has the correct columns
- Check Row Level Security (RLS) policies - they might be blocking inserts

## Database Schema

Make sure your Supabase database has the `reports` table with these columns:
- `id` (uuid, primary key)
- `title` (text)
- `type` (text)
- `status` (text) - values: 'open', 'investigating', 'resolved'
- `priority` (text) - values: 'low', 'medium', 'high', 'critical'
- `location` (text)
- `location_name` (text)
- `date` (date)
- `time` (time)
- `officer` (text)
- `description` (text)
- `evidence` (text[])
- `suspects` (text[])
- `victims` (text[])
- `damage` (text)
- `notes` (text)
- `report_type` (text) - default: 'crime'
- `reporter_id` (uuid, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

See `supabase_mock_data.sql` for the complete schema reference.

