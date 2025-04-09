RefreshLawn Codebase Improvement Plan

Goal: Address identified issues systematically, ensuring codebase improvements are clearly prioritized, manageable, and validated.

Phase 1: Core Refactoring & Cleanup (Highest Priority)

Complexity: 4/5 (High complexity, high impact)

Dependencies: Must be completed before subsequent phases.

Task 1.1: Consolidate Role Logic

Objective: Centralize all role-checking and management logic to improve consistency and maintainability.

Affected Files: lib/auth.tsx, hooks/useUserRole.ts, utils/roleUtils.ts, utils/userRoleManager.ts.

Steps:

Analyze logic in affected files.

Designate lib/auth.tsx & hooks/useUserRole.ts as primary sources.

Refactor necessary logic from utils/ files into primary files.

Update all consumers to use the consolidated logic.

Remove redundant functions/files (utils/roleUtils.ts, utils/userRoleManager.ts).

Validate: Thorough manual testing of role-dependent features (login, dashboard visibility, protected routes).

Target Architecture (Simplified):

graph LR
    A[Components] --> B(hooks/useUserRole.ts);
    B --> C(lib/auth.tsx);
    C --> D(lib/supabase.ts);
    style B fill:#ffc,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style D fill:#ccf,stroke:#333,stroke-width:2px

Task 1.2: Fix Supabase Client Imports (Quick Win)

Objective: Ensure single Supabase client instance usage.

Affected Files: Any file importing supabase.

Steps:

Search codebase for utils/supabase imports.

Replace all found instances with the correct import path to lib/supabase.ts.

Delete the deprecated utils/supabase.ts file.

Validate: Ensure app compiles and core database operations run without issue.

Phase 2: Performance Optimizations (High Priority)

Complexity: 3/5 (Medium complexity, high impact)

Dependencies: Complete Phase 1 first. Task 1.2 should ideally be done before Task 2.1.

Task 2.1: Implement Pagination

Objective: Improve performance of data-heavy list views.

Affected Files: lib/data.ts, app/components/admin/UserManagement.tsx, app/components/technician/JobsList.tsx, app/components/customer/ServiceHistory.tsx, etc.

Steps:

Modify data fetching functions in lib/data.ts to accept pagination parameters (.range()).

Update UI components to implement infinite scrolling or pagination controls.

Validate: Test list loading performance and data correctness with pagination.

Task 2.2: Optimize Data Fetching Selects (Quick Win)

Objective: Reduce unnecessary data transfer from Supabase.

Affected Files: lib/data.ts.

Steps:

Review select('*') calls.

Replace with specific column selections.

Validate: Check network requests for reduced payload size and verify UI still receives necessary data.

Task 2.3: Implement List Virtualization (Quick Win)

Objective: Enhance rendering performance for long lists.

Affected Files: app/components/customer/ServiceHistory.tsx, others using ScrollView for long lists.

Steps:

Replace ScrollView with FlatList or FlashList.

Configure list props (data, renderItem, keyExtractor).

Validate: Confirm improved scrolling performance and rendering.

Phase 3: Testing Expansion (Medium Priority)

Complexity: 3/5 (Medium complexity, essential for maintainability)

Dependencies: Ideal to do after Phase 1 & 2 refactoring.

Task 3.1: Setup & Write E2E Tests

Objective: Assure critical user paths work reliably.

Tools: Detox.

Steps (Priority Order):

Setup Detox for Expo.

Test Login flows (all roles).

Test Customer booking & Technician job update flows.

Test Registration flow.

Validate: Run E2E tests in CI/CD pipeline.

Task 3.2: Expand Unit & Component Tests

Objective: Build confidence in units and components.

Tools: Jest, @testing-library/react-native.

Steps (Priority Order):

Unit tests for core logic (lib/auth.tsx, consolidated role logic).

Component tests for critical UI (LoginForm, BookingForm, JobStatusUpdater).

Unit tests for utility functions.

Component tests for secondary UI elements.

Validate: Check test coverage reports.

Phase 4: Further Refinements (Lower Priority)

Complexity: 2/5 (Low to medium complexity, incremental improvements)

Dependencies: Can be done after major refactoring and testing setup.

Task 4.1: Component Refactoring

Objective: Enhance maintainability and readability.

Affected Files: app/components/customer/BookingForm.tsx, app/components/auth/RegistrationForm.tsx.

Steps: Identify logical sub-sections and extract them into separate sub-components.

Validate: Ensure forms function correctly after refactoring.

Task 4.2: Apply Performance Hooks

Objective: Reduce unnecessary renders based on profiling.

Affected Files: Components identified as bottlenecks.

Steps:

Profile application to identify bottlenecks.

Strategically apply React.memo, useCallback, useMemo.

Validate: Measure performance improvements.

Summary & Implementation Recommendations:

Immediate Focus: Phase 1 (foundational stability), followed quickly by quick-win performance improvements (Tasks 1.2, 2.2, 2.3).

Validation: After each major refactor (especially Phase 1), explicitly validate app stability and functionality through manual testing and running existing automated tests.

Testing Investment: Prioritize E2E tests for core flows (Task 3.1) early in Phase 3 to ensure stability during ongoing refactoring.

Incremental Implementation: Tackle tasks within phases based on priority and dependencies. Use quick wins strategically.