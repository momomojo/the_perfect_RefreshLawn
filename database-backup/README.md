# Database Backup and Restoration Guide

This directory contains everything needed to backup and restore your Supabase database. These instructions are designed to be simple and easy to follow.

## What's in this directory?

- `backup.sql`: The full database backup file containing your schema and data
- `schema.sql`: Just the database structure (tables, functions, etc.) without data
- `seed_data.sql`: Only the essential data needed to initialize your application

## How to Backup Your Database

To create a new backup of your database, run the following command:

```bash
# Log in to Supabase CLI if you haven't already
supabase login

# Create a full backup
supabase db dump -p sjgixmidwtwzbduakzkk --db-url postgresql://postgres:YOUR_PASSWORD@sjgixmidwtwzbduakzkk.supabase.co:5432/postgres > database-backup/backup.sql

# Create just the schema (structure only)
supabase db dump -p sjgixmidwtwzbduakzkk --db-url postgresql://postgres:YOUR_PASSWORD@sjgixmidwtwzbduakzkk.supabase.co:5432/postgres --schema-only > database-backup/schema.sql
```

Replace `YOUR_PASSWORD` with your actual Supabase database password.

## How to Restore Your Database

### Option 1: Using Supabase CLI (Easiest)

1. Install Supabase CLI if you haven't already:
   ```bash
   # For macOS/Linux
   brew install supabase/tap/supabase

   # For Windows via Scoop
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. Log in to Supabase:
   ```bash
   supabase login
   ```

3. Restore the database:
   ```bash
   # For full backup restoration
   supabase db restore -p sjgixmidwtwzbduakzkk --db-url postgresql://postgres:YOUR_PASSWORD@sjgixmidwtwzbduakzkk.supabase.co:5432/postgres database-backup/backup.sql
   
   # OR for just schema
   supabase db restore -p sjgixmidwtwzbduakzkk --db-url postgresql://postgres:YOUR_PASSWORD@sjgixmidwtwzbduakzkk.supabase.co:5432/postgres database-backup/schema.sql
   ```

### Option 2: Using the Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy and paste the contents of `backup.sql` (or `schema.sql`)
6. Run the query

## For Beginners

If you're new to databases and just want to restore things to the way they were:

1. Install the Supabase CLI using the instructions above
2. Open your command line (Terminal on Mac/Linux, Command Prompt or PowerShell on Windows)
3. Run these commands one by one:
   ```bash
   supabase login
   cd path/to/this/repository
   supabase db restore -p sjgixmidwtwzbduakzkk --db-url postgresql://postgres:YOUR_PASSWORD@sjgixmidwtwzbduakzkk.supabase.co:5432/postgres database-backup/backup.sql
   ```
4. That's it! Your database is now restored to the exact state of the backup.

## Need Help?

If you have any issues, please refer to the [Supabase CLI documentation](https://supabase.com/docs/reference/cli/usage) or [contact support](mailto:support@supabase.com).