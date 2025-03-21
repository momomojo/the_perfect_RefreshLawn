#!/bin/bash

# Supabase Database Backup Script
# This script creates backups of your Supabase database

# Configuration
PROJECT_ID="sjgixmidwtwzbduakzkk"
OUTPUT_DIR="$(dirname "$0")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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

echo "Creating backup for Supabase project: $PROJECT_ID"
echo "Please enter your database password when prompted"

# Create full backup
echo "Creating full database backup..."
supabase db dump -p $PROJECT_ID > "$OUTPUT_DIR/backup.sql"

# Create schema-only backup
echo "Creating schema-only backup..."
supabase db dump -p $PROJECT_ID --schema-only > "$OUTPUT_DIR/schema.sql"

# Create a dated backup for archival
echo "Creating dated backup archive..."
supabase db dump -p $PROJECT_ID > "$OUTPUT_DIR/backup_$TIMESTAMP.sql"

echo "Backup completed successfully!"
echo "Files created:"
echo "- $OUTPUT_DIR/backup.sql (Full database)"
echo "- $OUTPUT_DIR/schema.sql (Schema only)"
echo "- $OUTPUT_DIR/backup_$TIMESTAMP.sql (Archived backup)"