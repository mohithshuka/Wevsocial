// SDK 54 note: do NOT add "react-native-reanimated/plugin" or
// "react-native-worklets/plugin" here. Starting with Reanimated 4 /
// Expo SDK 54, babel-preset-expo configures the Worklets Babel plugin
// automatically. Adding it manually causes duplicate-plugin errors and
// broken animations.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
