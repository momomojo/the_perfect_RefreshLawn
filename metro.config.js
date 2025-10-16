const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname].filter(
  (folder) => !folder.includes("node_modules"),
);

// Add custom resolver to handle platform-specific modules
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Block @stripe/stripe-react-native on web platform
    if (platform === "web" && moduleName === "@stripe/stripe-react-native") {
      // Return a path to an empty module for web
      return {
        type: "empty",
      };
    }

    // Fall back to the default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
