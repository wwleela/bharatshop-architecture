// app.config.js — BharatShop OS 2026 (SDK 54)
module.exports = ({ config }) => ({
  ...config,
  name:        'BharatShop',
  slug:        'bharatshop-os',
  version:     '0.1.0',
  orientation: 'portrait',
  icon:        './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme:      'bharatshop',
  splash: {
    image:           './assets/splash.png',
    resizeMode:      'contain',
    backgroundColor: '#FFFFFF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet:    false,
    bundleIdentifier:  'com.urbangliding.bharatshop',
    infoPlist: {
      NSCameraUsageDescription:
        'BharatShop uses the camera to scan supplier bills and update your inventory automatically.',
      NSLocationWhenInUseUsageDescription:
        'BharatShop uses your location to show relevant product trends and weather suggestions for your area.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package:     'com.urbangliding.bharatshop',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
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
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'BharatShop uses your location to show local product trends and weather suggestions.',
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
});
