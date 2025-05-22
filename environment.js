import { Platform } from 'react-native';

// iOS-focused environment settings
export const isIOS = true;
export const isAndroid = false;

// iOS-specific settings
export const platformSettings = {
  ios: {
    // iOS-specific settings
  }
};

// Export platform-specific functions
export const getPlatformSetting = (setting) => {
  return platformSettings.ios[setting];
}; 