const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/server\/.*/];

config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs", "css"];

module.exports = config;
