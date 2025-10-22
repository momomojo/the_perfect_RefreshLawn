#!/bin/bash

# Test technician login credentials
echo "Testing technician login credentials..."
echo "Email: mohibhafeez@gmail.com"

curl --ssl-no-revoke -X POST "https://iqxdatlqgvdcvyfdxywf.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeGRhdGxxZ3ZkY3Z5ZmR4eXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Njc2MzgsImV4cCI6MjA3NjA0MzYzOH0.cG7qVGB0HWA-9k4_92cRAJcZFTcdpnrYAey5fpFNIJY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mohibhafeez@gmail.com\",\"password\":\"a1b2c3d4\"}" | jq .
