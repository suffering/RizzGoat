import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesConfiguration,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/secrets";

const isWebPlatform = Platform.OS === "web";
let configurationTask: Promise<void> | null = null;
let lastConfiguredUserId: string | null = null;

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log("[RevenueCatModule]", ...args);
  }
};

const applyLogLevel = () => {
  if (typeof Purchases.setLogLevel !== "function") {
    return;
  }

  const targetLevel = __DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR;
  Purchases.setLogLevel(targetLevel);
};

export const configureRevenueCat = async (
  appUserId?: string | null,
): Promise<void> => {
  if (isWebPlatform) {
    devLog("Skipping RevenueCat configuration on web");
    return;
  }

  if (!REVENUECAT_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_REVENUECAT_API_KEY environment variable.");
  }

  const normalizedUserId = appUserId ?? null;

  if (configurationTask && lastConfiguredUserId === normalizedUserId) {
    return configurationTask;
  }

  configurationTask = (async () => {
    applyLogLevel();
    const configuration: PurchasesConfiguration = {
      apiKey: REVENUECAT_API_KEY,
    };

    if (normalizedUserId) {
      configuration.appUserID = normalizedUserId;
    }

    devLog("Configuring RevenueCat", { user: normalizedUserId ?? "anonymous" });
    await Purchases.configure(configuration);
    lastConfiguredUserId = normalizedUserId;
    devLog("RevenueCat configured");
  })();

  return configurationTask;
};

export { LOG_LEVEL };
export default Purchases;
