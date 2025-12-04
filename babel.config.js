module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Required by expo-router
      require.resolve("expo-router/babel"),

      // Handle "@/..." imports
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [
            ".ios.ts",
            ".android.ts",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".json"
          ],
          alias: {
            "@": "./"
          }
        }
      ],

      // Keep this last
      "react-native-reanimated/plugin"
    ]
  };
};
