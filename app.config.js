module.exports = {
  name: 'FreewrightMobile',
  slug: 'FreewrightMobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.freewrightmobile'
  },
  web: {
    favicon: './assets/favicon.png',
  },
  experiments: {
    typedRoutes: true,
  },
}; 