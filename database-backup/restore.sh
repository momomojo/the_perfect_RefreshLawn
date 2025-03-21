#!/bin/bash

# Supabase Database Restore Script
# This script restores your Supabase database from a backup

# Configuration
PROJECT_ID="sjgixmidwtwzbduakzkk"
OUTPUT_DIR="$(dirname "$0")"

# Check if Supabase CLI is installed
if ! command -v supabase >/dev/null 2>&1; then
    echo "Error: Supabase CLI is not installed. Please install it first."
    echo "Installation instructions: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase projects list >/dev/null 2>&1; then
    echo "You need to log in to Supabase first. Run 'supabase login' and try again."
    exit 1
fi

# Menu for backup selection
echo "========== DATABASE RESTORE UTILITY =========="
echo "Supabase project: $PROJECT_ID"
echo ""
echo "Which backup do you want to restore?"
echo "1) Full database backup (backup.sql)"
echo "2) Schema only (schema.sql)"
echo "3) Choose another backup file"
echo "4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        backup_file="$OUTPUT_DIR/backup.sql"
        ;;
    2)
        backup_file="$OUTPUT_DIR/schema.sql"
        ;;
    3)
        echo "Available backup files:"
        ls -la "$OUTPUT_DIR"/*.sql
        echo ""
        read -p "Enter the backup filename: " custom_file
        backup_file="$OUTPUT_DIR/$custom_file"
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Check if file exists
if [ ! -f "$backup_file" ]; then
    echo "Error: Backup file does not exist: $backup_file"
    exit 1
fi

echo "Restoring database from: $backup_file"
echo "⚠️  WARNING: This will overwrite your current database data ⚠️"
read -p "Are you sure you want to continue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Please enter your database password when prompted"
echo "Restoring database..."

# Restore the database
supabase db restore -p $PROJECT_ID "$backup_file"

echo "Database restore completed!"