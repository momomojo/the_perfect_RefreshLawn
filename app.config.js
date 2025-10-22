import { config } from 'dotenv';

// Load .env file
config();

// Validate required environment variables at build time
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    '\n╔═══════════════════════════════════════════════════════════════════════════╗'
  );
  console.error(
    '║           BUILD FAILED: MISSING REQUIRED ENVIRONMENT VARIABLES            ║'
  );
  console.error(
    '╚═══════════════════════════════════════════════════════════════════════════╝\n'
  );
  console.error(
    '❌ The following required environment variables are missing:\n'
  );
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📚 SETUP INSTRUCTIONS:');
  console.error('   1. Create a .env file in the project root');
  console.error('   2. See ENVIRONMENT_SETUP.md for detailed instructions');
  console.error('   3. Add all required EXPO_PUBLIC_* variables');
  console.error('   4. Run: npx expo start --clear\n');
  console.error('📖 Documentation: See ENVIRONMENT_SETUP.md\n');

  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
}

// Log successful validation
console.log('✅ All required environment variables present');

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'LawnRefresh',
    slug: 'the-perfect-lawn-refresh', // Updated to match EAS project slug
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'lawnrefresh',
    userInterfaceStyle: 'light',
    newArchEnabled: true, // Enable React Native new architecture

    // Runtime version for OTA updates
    // Increment this when you change native code or add/remove native dependencies
    runtimeVersion: {
      policy: 'appVersion', // Uses app version as runtime version
    },

    // EAS Update configuration
    updates: {
      url: 'https://u.expo.dev/c51e72ec-cce4-4a50-a891-dd01bd8d9e8a',
      fallbackToCacheTimeout: 0,
      checkAutomatically: 'ON_LOAD',
      enabled: true,
    },

    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.lawnrefresh.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.lawnrefresh.app',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    extra: {
      // These are available at build time, but we also rely on process.env at runtime
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      eas: {
        projectId: 'c51e72ec-cce4-4a50-a891-dd01bd8d9e8a', // Confirmed EAS project ID
      },
    },
    plugins: [
      'expo-router', // File-based routing
      ['expo-secure-store'],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.lawnrefresh.app',
          enableGooglePay: true,
        },
      ],
      [
        'sentry-expo',
        {
          organization: process.env.SENTRY_ORG || 'mohib-hafeez',
          project: process.env.SENTRY_PROJECT || 'refreshlawn',
          // Auth token for source map uploads (from CI/EAS build secrets)
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
      ],
    ],
    experiments: {
      typedRoutes: true, // Enable TypeScript typed routes
    },
  },
};
