import { Platform } from "react-native";
import { REVENUECAT_API_KEY } from "@/secrets";

let configuredUserId: string | null = null;
let hasConfigured = false;
let configurePromise: Promise<void> | null = null;

const tag = "[RevenueCat]";

type PurchasesModule = typeof import("react-native-purchases");
type PurchasesInstance = PurchasesModule["default"];
type LogLevelType = PurchasesModule["LOG_LEVEL"];

let purchasesImportPromise: Promise<PurchasesModule | null> | null = null;

export const getPurchases = async (): Promise<PurchasesInstance | null> => {
if (Platform.OS === "web") return null;

if (!purchasesImportPromise) {
  purchasesImportPromise = import("react-native-purchases")
    .then((mod) => {
      const Purchases = mod?.default as PurchasesInstance | undefined;
      if (!Purchases || typeof Purchases.configure !== "function") {
        console.log(`${tag} react-native-purchases module loaded but missing native methods.`);
        return null;
      }
      return mod;
    })
    .catch((e: unknown) => {
      console.log(`${tag} Failed to load react-native-purchases`, {
        message: (e as Error)?.message,
      });
      return null;
    });
}

const mod = await purchasesImportPromise;
return mod?.default ?? null;
};

const getLogLevel = async (): Promise<LogLevelType | null> => {
if (Platform.OS === "web") return null;
const mod = await (purchasesImportPromise ?? import("react-native-purchases").catch(() => null));
return (mod as PurchasesModule | null)?.LOG_LEVEL ?? null;
};

const setDefaultLogLevel = async (): Promise<void> => {
const Purchases = await getPurchases();
if (!Purchases) return;

const LOG_LEVEL = await getLogLevel();
if (!LOG_LEVEL || typeof Purchases.setLogLevel !== "function") return;

const level = LOG_LEVEL.DEBUG ?? LOG_LEVEL.INFO ?? LOG_LEVEL.WARN ?? LOG_LEVEL.ERROR;
try {
  Purchases.setLogLevel(level);
} catch (e) {
  console.log(`${tag} setLogLevel failed`, { message: (e as Error)?.message });
}
};

export const configureRevenueCat = async (appUserId?: string | null): Promise<void> => {
if (Platform.OS === "web") {
  console.log(`${tag} Skipping configuration (web).`);
  return;
}

const Purchases = await getPurchases();
if (!Purchases) {
  console.log(`${tag} Skipping configuration (native module unavailable).`);
  return;
}

if (!REVENUECAT_API_KEY) {
  console.log(`${tag} Skipping configuration (missing EXPO_PUBLIC_REVENUECAT_API_KEY).`);
  return;
}

const normalizedUserId = appUserId ?? null;

if (hasConfigured && configuredUserId === normalizedUserId) {
  return;
}

if (configurePromise) {
  await configurePromise;
  if (hasConfigured && configuredUserId === normalizedUserId) return;
}

const performConfiguration = async () => {
  console.log(`${tag} Configuring Purchases`, {
    hasConfigured,
    previousAppUserId: configuredUserId,
    nextAppUserId: normalizedUserId,
    apiKeyPrefix: REVENUECAT_API_KEY.slice(0, 6),
    apiKeyLength: REVENUECAT_API_KEY.length,
  });

  await setDefaultLogLevel();

  const configuration: Record<string, unknown> = {
    apiKey: REVENUECAT_API_KEY,
  };

  if (normalizedUserId) {
    configuration.appUserID = normalizedUserId;
  }

  try {
    await Purchases.configure(configuration as never);
    configuredUserId = normalizedUserId;
    hasConfigured = true;
    console.log(`${tag} Configured successfully`, { appUserId: configuredUserId });
  } catch (e) {
    console.log(`${tag} Purchases.configure failed`, { message: (e as Error)?.message });
    throw e;
  }
};

configurePromise = performConfiguration();
await configurePromise;
};