# Stripe Function Deployment Fix - Bundling Strategy

## Problem

Stripe API functions failed during deployment due to issues importing shared utility code from a directory named `_shared`. Supabase CLI does not allow deploying functions with names starting with underscores, and relative imports across function directories don't work in the deployed environment.

The previous workaround involved inlining the shared code into each function, which caused significant code duplication.

## Solution: Deno Bundling

To resolve this while keeping the source code DRY, we now use a Deno bundling step before deployment:

1.  **Shared Code:** Common utilities (HTTP, Stripe, Auth) are now located in `supabase/functions/shared/`.
2.  **Source Functions:** The original function files (e.g., `supabase/functions/stripe-payment-api/index.ts`) import utilities using relative paths like `import { ... } from "../shared/http-utils.ts";`.
3.  **Bundling Script:** A script `supabase/bundle_functions.ts` uses Deno's bundler (`deno_emit` or `deno bundle`) to process each source function.
4.  **Output:** The script outputs self-contained, bundled versions of each function into a new directory: `supabase/functions_bundled/<function_name>/index.js`.
5.  **`.gitignore`:** The `supabase/functions_bundled/` directory is added to `.gitignore` to prevent committing generated code.

## Development vs. Deployment

- **Local Development (`supabase start`):** Works directly with the source files in `supabase/functions/`. Deno handles the relative imports correctly.
- **Deployment (`supabase functions deploy`):** Requires running the bundling script first, then deploying the bundled functions from `supabase/functions_bundled/`.

## Deployment Workflow

1.  **Ensure Docker Desktop is installed and running.**
2.  **Navigate to the `supabase` directory:**
    ```bash
    cd supabase
    ```
3.  **Run the bundling script:**
    ```bash
    # Ensure Deno is installed (https://deno.land/#installation)
    deno run --allow-read --allow-write --allow-run bundle_functions.ts
    ```
    - This will create or update the `supabase/functions_bundled/` directory.
4.  **Navigate to the bundled output directory:**
    ```bash
    cd functions_bundled
    ```
5.  **Deploy each function individually:**
    ```bash
    supabase functions deploy stripe-payment-api
    supabase functions deploy stripe-customer-api
    supabase functions deploy stripe-subscription-api
    supabase functions deploy stripe-admin-api
    supabase functions deploy stripe-refund
    # Add other functions as needed
    ```
6.  **Return to the project root:**
    ```bash
    cd ../..
    ```
7.  **Verify deployment** by testing the function endpoints.

This approach keeps the source code organized and avoids duplication while ensuring functions deploy correctly.

## Future Recommendations

For future development:

1. Consider using a shared library package that can be imported from a URL instead of local files:

   ```typescript
   import { sharedUtils } from "https://esm.sh/my-shared-utils@1.0.0";
   ```

2. Alternatively, use function imports with named parameters to avoid directory sharing:

   ```
   supabase/functions/
   ├── stripe-payment-api/
   │   └── index.ts
   ├── stripe-customer-api/
   │   └── index.ts
   └── utils/
       ├── http-utils.ts
       ├── stripe-utils.ts
       └── auth-utils.ts
   ```

   And deploy "utils" as a separate function:

   ```bash
   supabase functions deploy utils
   ```

3. Always test deployment in a staging environment before pushing to production.
