import 'dotenv/config';

export default {
  expo: {
    name: "RizzGoat",
    slug: "rizzgoat-flirting-self-improvement",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    extra: {
      EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "app.rork.rizzgoat-flirting-self-improvement",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "Allow $(PRODUCT_NAME) to access your photos",
        NSCameraUsageDescription:
          "Allow $(PRODUCT_NAME) to access your camera",
        NSMicrophoneUsageDescription:
          "Allow $(PRODUCT_NAME) to access your microphone",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "app.rork.rizzgoat-flirting-self-improvement",
      permissions: ["android.permission.VIBRATE", "CAMERA"],
    },

    web: {
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      [
        "expo-router",
        { origin: "https://rork.com/" }
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "The app accesses your photos to let you share them with your friends.",
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};
