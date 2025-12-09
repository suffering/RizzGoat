type EnvShape = {
  OPENAI_API_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_API_KEY?: string;
  [key: string]: string | undefined;
};

const env: EnvShape =
  typeof process !== "undefined" && typeof process.env !== "undefined"
    ? (process.env as EnvShape)
    : {};

export const OPENAI_API_KEY: string = env.OPENAI_API_KEY ?? "";
export const REVENUECAT_API_KEY: string = env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "";
