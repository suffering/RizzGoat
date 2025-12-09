import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesConfiguration,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/secrets";

let configuredUserId: string | null = null;
let hasConfigured = false;
let configurePromise: Promise<void> | null = null;

const canUseRevenueCat = Platform.OS !== "web";

const setDefaultLogLevel = () => {
  if (!LOG_LEVEL || typeof Purchases.setLogLevel !== "function") return;
  const level = LOG_LEVEL.DEBUG ?? LOG_LEVEL.INFO ?? LOG_LEVEL.WARN ?? LOG_LEVEL.ERROR;
  Purchases.setLogLevel(level);
};

export const configureRevenueCat = async (
  appUserId?: string | null,
): Promise<void> => {
  if (!canUseRevenueCat) {
    return;
  }

  if (!REVENUECAT_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.");
  }

  const normalizedUserId = appUserId ?? null;

  if (hasConfigured && configuredUserId === normalizedUserId) {
    return;
  }

  const performConfiguration = async () => {
    setDefaultLogLevel();
    const configuration: PurchasesConfiguration = {
      apiKey: REVENUECAT_API_KEY,
    };
    if (normalizedUserId) {
      configuration.appUserID = normalizedUserId;
    }
    await Purchases.configure(configuration);
    configuredUserId = normalizedUserId;
    hasConfigured = true;
  };

  configurePromise = performConfiguration();
  await configurePromise;
};

if (canUseRevenueCat) {
  void configureRevenueCat().catch((error) => {
    console.error("[RevenueCat] Initial configuration failed", error);
  });
}

export { LOG_LEVEL };
export default Purchases;
