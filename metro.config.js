// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Simply use the default config - expo-notifications should work out of the box
// If there are issues, they might be due to other factors

module.exports = config;

