# Cleanup and Organization Plan for JWT Hook Implementation

## Current State Analysis

The codebase currently contains:

1. **Working SQL files in the supabase directory**:

   - `schema.sql`: Basic table structure and initial triggers
   - `rls.sql`: Row Level Security policies
   - `jwt-claims.sql`: JWT claims helper functions
   - `custom_access_token_hook.sql`: Custom access token hook function

2. **Temporary diagnostic and solution files**:

   - Multiple `.sql` files for testing and fixing the JWT hook
   - Multiple `.md` documentation files explaining the JWT hook issue
   - Some files contain test-specific user IDs that shouldn't be in production code

3. **Organization issues**:
   - No standard Supabase migrations directory structure
   - Overlapping functions between files
   - Documentation scattered across multiple files

## Cleanup and Organization Tasks

### 1. Create Standard Supabase Directory Structure

- Create a proper Supabase migrations directory structure
- Organize SQL files according to Supabase best practices

### 2. Consolidate SQL Files

- Update the `custom_access_token_hook.sql` file with our working solution (with explicit type casting)
- Ensure the JWT claims functions in `jwt-claims.sql` and our fixes are harmonized
- Remove redundant/conflicting code between files

### 3. Archive Diagnostic Files

- Create a `docs` directory to store important documentation
- Consolidate relevant documentation into a single comprehensive JWT Hook guide
- Archive diagnostic SQL files that might be useful for future reference

### 4. Clean Production Code

- Remove test-specific user IDs and temporary emergency fixes
- Ensure all SQL files use proper type casting to avoid the polymorphic type error
- Update permissions and trigger setup for the JWT hook function

### 5. Document Deployment Process

- Create clear instructions for enabling the JWT hook in the Supabase Dashboard
- Document the migration process for new environments

## Implementation Plan

1. **Step 1: Set Up Directory Structure**

   - Create `supabase/migrations` directory
   - Create `supabase/docs` directory for documentation

2. **Step 2: Create Migration Files**

   - Create migration file for JWT hook function
   - Create migration file for triggers
   - Create migration file for helper functions

3. **Step 3: Consolidate Documentation**

   - Create comprehensive JWT setup guide
   - Document troubleshooting steps

4. **Step 4: Clean Up and Remove Temporary Files**

   - Move useful diagnostic files to docs directory
   - Remove redundant files

5. **Step 5: Test and Verify**
   - Ensure all migrations run correctly
   - Verify JWT hook functionality after cleanup
