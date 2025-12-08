const readEnv = (key: string): string | undefined => {
  if (typeof process === "undefined") return undefined;
  const value = process.env?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const OPENAI_API_KEY: string = readEnv("OPENAI_API_KEY") ?? "";
export const REVENUECAT_API_KEY: string =
  readEnv("EXPO_PUBLIC_REVENUECAT_API_KEY") ?? readEnv("REVENUECAT_API_KEY") ?? "";
