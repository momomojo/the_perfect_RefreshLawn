/**
 * Environment Variable Validation Utility
 *
 * Validates that all required environment variables are present and properly configured.
 * This prevents runtime failures due to missing configuration.
 */

import Constants from "expo-constants";

// Define environment variable requirements
interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

const CLIENT_ENV_VARS: EnvVar[] = [
  {
    key: "EXPO_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL (e.g., https://xxx.supabase.co)",
    required: true,
    validator: (val) => val.startsWith("http") && val.includes("supabase"),
  },
  {
    key: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anonymous/public key",
    required: true,
    validator: (val) => val.length > 100, // Supabase keys are long
  },
  {
    key: "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    description: "Stripe publishable key (pk_test_* or pk_live_*)",
    required: true,
    validator: (val) => val.startsWith("pk_"),
  },
  {
    key: "EXPO_PUBLIC_APP_NAME",
    description: "Application name",
    required: false,
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  values: Record<string, string | undefined>;
}

/**
 * Get environment variable value from both process.env and Constants
 */
function getEnvValue(key: string): string | undefined {
  // Try process.env first
  const processEnv = process.env[key];
  if (processEnv) return processEnv;

  // Try Constants.expoConfig.extra for backward compatibility
  const extraKey = key.replace("EXPO_PUBLIC_", "").toLowerCase();
  const extraKeyMap: Record<string, string> = {
    supabase_url: "supabaseUrl",
    supabase_anon_key: "supabaseAnonKey",
    stripe_publishable_key: "stripePublishableKey",
    app_name: "appName",
  };

  const mappedKey = extraKeyMap[extraKey.toLowerCase()];
  if (mappedKey && Constants.expoConfig?.extra?.[mappedKey]) {
    return Constants.expoConfig.extra[mappedKey];
  }

  return undefined;
}

/**
 * Validate all client-side environment variables
 */
export function validateClientEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const values: Record<string, string | undefined> = {};

  console.log("[EnvValidation] Starting environment validation...");

  for (const envVar of CLIENT_ENV_VARS) {
    const value = getEnvValue(envVar.key);
    values[envVar.key] = value;

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(
        `❌ MISSING REQUIRED: ${envVar.key}\n   Description: ${envVar.description}\n   This variable is required for the app to function.`
      );
      continue;
    }

    // Skip validation if optional and missing
    if (!envVar.required && !value) {
      warnings.push(
        `⚠️  OPTIONAL MISSING: ${envVar.key}\n   Description: ${envVar.description}\n   The app will use default values.`
      );
      continue;
    }

    // Run custom validator if present
    if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(
        `❌ INVALID FORMAT: ${envVar.key}\n   Description: ${envVar.description}\n   Current value does not match expected format.`
      );
      continue;
    }

    // Success
    console.log(`[EnvValidation] ✅ ${envVar.key}: Present and valid`);
  }

  const valid = errors.length === 0;

  if (!valid) {
    console.error(
      "[EnvValidation] ❌ VALIDATION FAILED\n" + errors.join("\n\n")
    );
  }

  if (warnings.length > 0) {
    console.warn("[EnvValidation] Warnings:\n" + warnings.join("\n\n"));
  }

  if (valid && errors.length === 0 && warnings.length === 0) {
    console.log(
      "[EnvValidation] ✅ All environment variables validated successfully"
    );
  }

  return { valid, errors, warnings, values };
}

/**
 * Validate and throw if required variables are missing
 * Use this at app startup to fail fast
 */
export function requireClientEnvironment(): void {
  const result = validateClientEnvironment();

  if (!result.valid) {
    const errorMessage = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                 ENVIRONMENT VARIABLE VALIDATION FAILED                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

${result.errors.join("\n\n")}

${result.warnings.length > 0 ? "\n" + result.warnings.join("\n\n") : ""}

📚 SETUP INSTRUCTIONS:
   1. Create a .env file in the project root
   2. Copy the contents from .env.example (see ENVIRONMENT_SETUP.md)
   3. Fill in all required EXPO_PUBLIC_* variables
   4. Restart the development server

📖 For detailed setup instructions, see:
   - ENVIRONMENT_SETUP.md
   - README.md

🔗 Where to find these values:
   - Supabase: https://app.supabase.com/project/YOUR_PROJECT/settings/api
   - Stripe: https://dashboard.stripe.com/test/apikeys
`;

    throw new Error(errorMessage);
  }
}

/**
 * Get formatted environment info for debugging
 */
export function getEnvironmentInfo(): string {
  const result = validateClientEnvironment();

  let info =
    "╔═══════════════════════════════════════════════════════════════════════════╗\n";
  info +=
    "║                      ENVIRONMENT CONFIGURATION                            ║\n";
  info +=
    "╚═══════════════════════════════════════════════════════════════════════════╝\n\n";

  for (const [key, value] of Object.entries(result.values)) {
    const envVar = CLIENT_ENV_VARS.find((v) => v.key === key);
    const status = value ? "✅" : "❌";
    const displayValue = value
      ? value.length > 50
        ? value.substring(0, 47) + "..."
        : value
      : "NOT SET";

    info += `${status} ${key}\n`;
    info += `   ${envVar?.description || "No description"}\n`;
    info += `   Value: ${displayValue}\n\n`;
  }

  if (result.errors.length > 0) {
    info += "\n❌ ERRORS:\n" + result.errors.join("\n\n") + "\n\n";
  }

  if (result.warnings.length > 0) {
    info += "\n⚠️  WARNINGS:\n" + result.warnings.join("\n\n") + "\n\n";
  }

  return info;
}

/**
 * Helper to safely get environment variables with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = getEnvValue(key);
  if (!value && !fallback) {
    throw new Error(
      `Environment variable ${key} is not set and no fallback was provided. ` +
        `Please check your .env file and ENVIRONMENT_SETUP.md for configuration instructions.`
    );
  }
  return value || fallback || "";
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return !__DEV__;
}

/**
 * Get Supabase configuration
 */
export function getSupabaseConfig() {
  return {
    url: getEnv("EXPO_PUBLIC_SUPABASE_URL"),
    anonKey: getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/**
 * Get Stripe configuration
 */
export function getStripeConfig() {
  return {
    publishableKey: getEnv("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  };
}



