import "dotenv/config";

export default ({ config }) => ({
  ...config,

  name: "RizzGoat",
  slug: "rizzgoat-flirting-self-improvement",

  extra: {
    ...config.extra,

    // Public env for client-side code
    EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    
    // Server-side / backend env
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // EAS project ID (required for TestFlight builds)
    eas: {
      projectId: "137d9bd7-8780-446d-b757-812fd1f6d737",
    },
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

  updates: {
    fallbackToCacheTimeout: 0,
  },
});
