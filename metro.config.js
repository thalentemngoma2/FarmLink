// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore the entire 'server' folder
config.resolver.blockList = [
  /server\/.*/,
];

module.exports = config;