const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Block server files and native-only modules on web
config.resolver.blockList = [
  /server\/.*/,
  /node_modules\/react-native-maps\/.*/,
];

module.exports = config;
