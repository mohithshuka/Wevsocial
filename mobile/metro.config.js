const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  "@kernel": path.resolve(__dirname, "kernel"),
  "@mini-apps": path.resolve(__dirname, "mini-apps"),
  "@shared": path.resolve(__dirname, "shared"),
  "@app-types": path.resolve(__dirname, "types"),
};

module.exports = config;
