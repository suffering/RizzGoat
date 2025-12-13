import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesConfiguration,
} from "react-native-purchases";
import { REVENUECAT_API_KEY } from "@/secrets";

let configuredUserId: string | null = null;
let hasConfigured = false;
let configurePromise: Promise<void> | null = null;

const tag = "[RevenueCat]";

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
    console.log(`${tag} Skipping configuration (web).`);
    return;
  }

  if (!REVENUECAT_API_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_REVENUECAT_API_KEY (preferred) or EXPO_GO_REVENUECAT_API_KEY environment variable.",
    );
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

    console.log(`${tag} Configured successfully`, {
      appUserId: configuredUserId,
    });
  };

  configurePromise = performConfiguration();
  await configurePromise;
};

export { LOG_LEVEL };
export default Purchases;
