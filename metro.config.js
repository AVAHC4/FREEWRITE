// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add specific file extensions for transpiling
config.resolver.sourceExts = [
  'js', 'jsx', 'json', 'ts', 'tsx'
];

module.exports = config; 