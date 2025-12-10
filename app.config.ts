import "dotenv/config";

export default ({ config }) => ({
  ...config,

  name: "RizzGoat",
  slug: "rizzgoat-flirting-self-improvement",

  extra: {
    ...config.extra,

    // RevenueCat public API key exposed to the client
    EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,

    // OpenAI API key (server-side)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },

  ios: {
    ...config.ios,
    bundleIdentifier: "app.rork.rizzgoat-flirting-self-improvement",
    supportsTablet: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Allow RizzGoat to access your photos",
      NSCameraUsageDescription: "Allow RizzGoat to access your camera",
      NSMicrophoneUsageDescription: "Allow RizzGoat to access your microphone",
    },
  },

  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
});


