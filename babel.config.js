module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["expo/internal/babel-preset"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
