const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "backend/**"],
  },
  {
    files: ["backend/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "import/no-unresolved": "off",
    },
  },
]);
