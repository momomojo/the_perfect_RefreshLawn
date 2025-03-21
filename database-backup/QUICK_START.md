# Quick Start Guide for Database Backup and Restore

This guide will walk you through the simplest way to backup and restore your Supabase database. No complicated steps - just follow these instructions!

## Backing Up Your Database

### For Windows Users

1. Make sure you have [Supabase CLI installed](https://supabase.com/docs/guides/cli/getting-started)
2. Double-click on `backup.bat` in this folder
3. Enter your password when prompted
4. That's it! Your database is now backed up in this folder

### For Mac/Linux Users

1. Make sure you have [Supabase CLI installed](https://supabase.com/docs/guides/cli/getting-started)
2. Open Terminal and navigate to this folder
3. Run: `chmod +x backup.sh` to make the script executable
4. Run: `./backup.sh`
5. Enter your password when prompted
6. That's it! Your database is now backed up in this folder

## Restoring Your Database

### For Windows Users

1. Make sure you have [Supabase CLI installed](https://supabase.com/docs/guides/cli/getting-started)
2. Double-click on `restore.bat` in this folder
3. Choose which backup you want to restore (full backup, schema only, or a specific file)
4. Confirm that you want to proceed
5. Enter your password when prompted
6. That's it! Your database is now restored

### For Mac/Linux Users

1. Make sure you have [Supabase CLI installed](https://supabase.com/docs/guides/cli/getting-started)
2. Open Terminal and navigate to this folder
3. Run: `chmod +x restore.sh` to make the script executable
4. Run: `./restore.sh`
5. Choose which backup you want to restore (full backup, schema only, or a specific file)
6. Confirm that you want to proceed
7. Enter your password when prompted
8. That's it! Your database is now restored

## FAQ

### What's the difference between full backup and schema only?

- **Full backup**: Contains all your database tables, functions, AND the data
- **Schema only**: Contains just the structure (tables, functions) WITHOUT any data

### How often should I backup my database?

It's recommended to backup your database:
- Before making major changes
- After adding important data
- At regular intervals (daily/weekly)

### Can I schedule automatic backups?

Yes! You can use your operating system's task scheduler:
- Windows: Task Scheduler
- Mac/Linux: Cron jobs

### What if I accidentally restore the wrong backup?

Always keep multiple backups with timestamps. If you restore the wrong one, you can always restore from an earlier backup.

### Need more help?

Check the detailed README.md in this folder for more advanced usage and options.