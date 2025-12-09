import type PurchasesType from "react-native-purchases";

const Purchases = null as unknown as PurchasesType;
const LOG_LEVEL = null;

export const configureRevenueCat = async (): Promise<void> => {
  if (__DEV__) {
    console.log("[RevenueCatModule] Web platform does not configure RevenueCat");
  }
};

export { LOG_LEVEL };
export default Purchases;
