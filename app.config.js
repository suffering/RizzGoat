export default {
  expo: {
    name: "RizzGoat",
    slug: "rizzgoat",
    version: "2.0.0",
    scheme: "rizzgoat",
    extra: {
      EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }
};
