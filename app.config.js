require('dotenv').config();

module.exports = {
  expo: {
    name: "",
    slug: "altrano",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "myapp",
    splash: {
      backgroundColor: "#FFFFFF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "cz.digitalmind.altrano"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo_small.png",
        backgroundColor: "#FFFFFF"
      },
      package: "cz.digitalmind.altrano",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            buildToolsVersion: "35.0.0"
          }
        }
      ],
      "expo-font"
    ],
    extra: {
      eas: {
        projectId: "439137ea-990b-4243-aa17-f638034f457f"
      },
      // Make environment variables available in the app
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
};

