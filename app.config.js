import { config } from "dotenv";

// Load .env file
config();

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || "LawnRefresh",
    slug: "the-perfect-lawn-refresh", // Updated to match EAS project slug
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "lawnrefresh",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lawnrefresh.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.lawnrefresh.app",
    },
    web: {
      favicon: "./assets/images/favicon.png",
    },
    extra: {
      // These are available at build time, but we also rely on process.env at runtime
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      eas: {
        projectId: "c51e72ec-cce4-4a50-a891-dd01bd8d9e8a", // Confirmed EAS project ID
      },
    },
    plugins: [["expo-secure-store"]],
  },
};
