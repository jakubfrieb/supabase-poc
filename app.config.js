require('dotenv').config();

module.exports = {
  expo: {
    name: "Altrano",
    slug: "altrano",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "myapp", // Deep linking scheme - configure redirect URL in Supabase Dashboard as: myapp://**
    splash: {
      backgroundColor: "#FFFFFF"
    },
    notification: {
      icon: "./assets/logo_small.png",
      color: "#007AFF"
    },
    ios: {
      icon: "./assets/logo_small.png",
      supportsTablet: true,
      bundleIdentifier: "cz.digitalmind.altrano"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/mobile-icon.jpg",
        backgroundColor: "#FFFFFF"
      },
      icon: "./assets/mobile-icon.jpg",
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

