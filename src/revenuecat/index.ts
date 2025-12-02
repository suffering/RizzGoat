import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  const iosApiKey = 'test_rtpJYQRunpmnybPXjhHVzzuWZwy';
  const androidApiKey = 'test_rtpJYQRunpmnybPXjhHVzzuWZwy';

  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: iosApiKey });
  } else {
    Purchases.configure({ apiKey: androidApiKey });
  }
}
