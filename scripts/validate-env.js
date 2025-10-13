#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Run this script to validate that all required environment variables are set.
 * Usage: npm run validate-env
 */

const { config } = require("dotenv");
const fs = require("fs");
const path = require("path");

// Load .env file
config();

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Define required environment variables
const requiredVars = [
  {
    name: "EXPO_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL",
    example: "https://xxx.supabase.co",
    validator: (val) => val.startsWith("http") && val.includes("supabase"),
  },
  {
    name: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anonymous/public key",
    example: "eyJhbGc...",
    validator: (val) => val.length > 100,
  },
  {
    name: "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    description: "Stripe publishable key",
    example: "pk_test_...",
    validator: (val) => val.startsWith("pk_"),
  },
];

const optionalVars = [
  {
    name: "EXPO_PUBLIC_APP_NAME",
    description: "Application display name",
    default: "LawnRefresh",
  },
];

console.log(
  `\n${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════════════════════╗${colors.reset}`
);
console.log(
  `${colors.cyan}${colors.bold}║           ENVIRONMENT VARIABLE VALIDATION                                 ║${colors.reset}`
);
console.log(
  `${colors.cyan}${colors.bold}╚═══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`
);

// Check if .env file exists
const envPath = path.join(process.cwd(), ".env");
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log(
    `${colors.yellow}⚠️  WARNING: .env file not found at ${envPath}${colors.reset}\n`
  );
  console.log("📚 Setup Instructions:");
  console.log("   1. Create a .env file in the project root");
  console.log("   2. See ENVIRONMENT_SETUP.md for detailed instructions\n");
} else {
  console.log(`${colors.green}✅ .env file found${colors.reset}\n`);
}

let hasErrors = false;
let hasWarnings = false;

// Validate required variables
console.log(`${colors.bold}Required Variables:${colors.reset}\n`);

for (const varConfig of requiredVars) {
  const value = process.env[varConfig.name];

  if (!value) {
    hasErrors = true;
    console.log(`${colors.red}❌ ${varConfig.name}${colors.reset}`);
    console.log(`   Description: ${varConfig.description}`);
    console.log(`   Example: ${varConfig.example}`);
    console.log(`   ${colors.red}STATUS: MISSING (Required)${colors.reset}\n`);
  } else if (varConfig.validator && !varConfig.validator(value)) {
    hasErrors = true;
    console.log(`${colors.red}❌ ${varConfig.name}${colors.reset}`);
    console.log(`   Description: ${varConfig.description}`);
    console.log(`   Example: ${varConfig.example}`);
    console.log(`   ${colors.red}STATUS: INVALID FORMAT${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✅ ${varConfig.name}${colors.reset}`);
    console.log(`   Description: ${varConfig.description}`);
    const displayValue =
      value.length > 50 ? value.substring(0, 47) + "..." : value;
    console.log(`   Value: ${displayValue}`);
    console.log(`   ${colors.green}STATUS: Valid${colors.reset}\n`);
  }
}

// Validate optional variables
console.log(`${colors.bold}Optional Variables:${colors.reset}\n`);

for (const varConfig of optionalVars) {
  const value = process.env[varConfig.name];

  if (!value) {
    hasWarnings = true;
    console.log(`${colors.yellow}⚠️  ${varConfig.name}${colors.reset}`);
    console.log(`   Description: ${varConfig.description}`);
    console.log(`   Default: ${varConfig.default}`);
    console.log(
      `   ${colors.yellow}STATUS: Using default value${colors.reset}\n`
    );
  } else {
    console.log(`${colors.green}✅ ${varConfig.name}${colors.reset}`);
    console.log(`   Description: ${varConfig.description}`);
    console.log(`   Value: ${value}`);
    console.log(`   ${colors.green}STATUS: Custom value set${colors.reset}\n`);
  }
}

// Server-side variables reminder
console.log(
  `${colors.bold}Server-Side Variables (Supabase Edge Functions):${colors.reset}\n`
);
console.log(
  `${colors.cyan}ℹ️  These must be set in your Supabase project:${colors.reset}\n`
);
console.log("   - SUPABASE_URL");
console.log("   - SUPABASE_SERVICE_ROLE_KEY");
console.log("   - STRIPE_SECRET_KEY");
console.log("   - STRIPE_WEBHOOK_SECRET");
console.log("   - STRIPE_PUBLISHABLE_KEY\n");
console.log(
  `${colors.cyan}📖 See ENVIRONMENT_SETUP.md for instructions on setting server secrets${colors.reset}\n`
);

// Summary
console.log(
  `${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════════════════════╗${colors.reset}`
);
console.log(
  `${colors.cyan}${colors.bold}║           VALIDATION SUMMARY                                              ║${colors.reset}`
);
console.log(
  `${colors.cyan}${colors.bold}╚═══════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`
);

if (hasErrors) {
  console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
  console.log(
    `${colors.red}One or more required environment variables are missing or invalid.${colors.reset}\n`
  );
  console.log("📚 Next Steps:");
  console.log("   1. Review the errors above");
  console.log("   2. Update your .env file with correct values");
  console.log("   3. See ENVIRONMENT_SETUP.md for detailed instructions");
  console.log("   4. Run this script again: npm run validate-env\n");
  process.exit(1);
} else if (hasWarnings) {
  console.log(
    `${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`
  );
  console.log(
    `${colors.yellow}All required variables are set, but some optional variables are using defaults.${colors.reset}\n`
  );
  console.log("✅ You can proceed with development");
  console.log("💡 Consider setting optional variables for customization\n");
  process.exit(0);
} else {
  console.log(
    `${colors.green}${colors.bold}✅ VALIDATION PASSED${colors.reset}`
  );
  console.log(
    `${colors.green}All environment variables are properly configured!${colors.reset}\n`
  );
  console.log("🚀 You're ready to start development:");
  console.log("   npx expo start\n");
  process.exit(0);
}



