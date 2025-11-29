// This file reads sensitive configuration from environment variables
// Do not hardcode secrets here
export const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY ?? "";