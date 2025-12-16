const fromProcessEnv = (key: string): string | undefined => {
  try {
    const value = (process.env as Record<string, string | undefined>)[key];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
};

export const REVENUECAT_API_KEY: string =
  fromProcessEnv("EXPO_PUBLIC_REVENUECAT_API_KEY") ?? "";

export const OPENAI_API_KEY: string =
  fromProcessEnv("OPENAI_API_KEY") ?? "";
