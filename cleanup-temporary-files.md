# Temporary Files Cleanup

The following temporary files can be safely removed now that we've organized the codebase:

## SQL Diagnostic Files

- `fix-jwt-claims.sql` - Consolidated into migration files
- `fix-jwt-config.sql` - Consolidated into migration files
- `jwt-hook-diagnosis-fix.sql` - Consolidated into migration files
- `jwt-hook-test.sql` - Moved to docs directory
- `run-in-supabase-dashboard.sql` - No longer needed
- `simplified-jwt-hook.sql` - Consolidated into migration files
- `update-all-user-roles.sql` - Consolidated into migration files

## Documentation Files

- `jwt-claims-gotrue-update.md` - Consolidated into main documentation
- `jwt-claims-solution-summary.md` - Consolidated into main documentation
- `jwt-testing-steps.md` - Consolidated into main documentation
- `supabase-jwt-hook-setup.md` - Consolidated into main documentation
- `supabase-jwt-hooks-visual-guide.md` - Consolidated into main documentation

## Files to Keep (already organized)

- All files in `supabase/migrations/`
- All files in `supabase/docs/`
- `supabase/schema.sql`
- `supabase/rls.sql`
- `supabase/README.md`
- `cleanup-organization-plan.md` (for reference)

## Manual Cleanup Commands

```powershell
# Remove temporary SQL files
rm fix-jwt-claims.sql
rm fix-jwt-config.sql
rm jwt-hook-diagnosis-fix.sql
rm jwt-hook-test.sql
rm run-in-supabase-dashboard.sql
rm simplified-jwt-hook.sql
rm update-all-user-roles.sql

# Remove temporary documentation files
rm jwt-claims-gotrue-update.md
rm jwt-claims-solution-summary.md
rm jwt-testing-steps.md
rm supabase-jwt-hook-setup.md
rm supabase-jwt-hooks-visual-guide.md
```

**Note**: You may want to review these files before deletion to ensure there's no unique information that hasn't been captured in the organized files.
