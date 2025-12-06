const sanitize = (value?: string | null): string => (value ?? "").trim();

export const OPENAI_API_KEY: string = sanitize(process.env.OPENAI_API_KEY);
export const REVENUECAT_API_KEY: string = sanitize(
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
);
