import Purchases from 'react-native-purchases';

export async function isProUser(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['RizzGoat Pro'] !== undefined;
  } catch (error) {
    console.error("Failed to fetch customer info", error);
    return false;
  }
}
