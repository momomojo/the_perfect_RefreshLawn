import { config } from "dotenv";

// Load .env file
config();

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || "LawnRefresh",
    slug: "lawnrefresh",
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
      eas: {
        projectId: "your-project-id", // Replace with actual EAS project ID if deploying
      },
    },
    plugins: [["expo-secure-store"]],
  },
};
