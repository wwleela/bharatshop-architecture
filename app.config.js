// app.config.js — BharatShop OS 2026 (SDK 54)
module.exports = ({ config }) => ({
  ...config,
  name:        'BharatShop OS',
  slug:        'bharatshop-os',
  version:     '0.1.0',
  orientation: 'portrait',
  icon:        './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme:      'bharatshop',
  splash: {
    image:           './assets/splash.png',
    resizeMode:      'contain',
    backgroundColor: '#0F0F0F',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet:    false,
    bundleIdentifier:  'com.urbangliding.bharatshop',
    infoPlist: {
      NSCameraUsageDescription:
        'BharatShop uses the camera to scan supplier bills and update your inventory automatically.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F0F0F',
    },
    package:     'com.urbangliding.bharatshop',
    permissions: ['android.permission.CAMERA'],
    softwareKeyboardLayoutMode: 'pan',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission:
          'BharatShop needs camera access to scan supplier bills — no typing required.',
      },
    ],
    'expo-router',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    EXPO_PUBLIC_SUPABASE_URL:      process.env.EXPO_PUBLIC_SUPABASE_URL      ?? '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    EXPO_PUBLIC_MIXPANEL_TOKEN:    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN    ?? '',
    APP_ENV:                       process.env.APP_ENV                       ?? 'development',
    eas: {
      projectId: 'FILL_IN_AFTER_EAS_INIT',
    },
  },
  // NOTE: sdkVersion intentionally removed — causes wrong SDK detection
});
