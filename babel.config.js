module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo（SDK 54+）会在检测到 react-native-worklets 时自动加入
    // react-native-worklets/plugin，从而正确转译 reanimated/worklets 的 worklet 代码。
    // 缺少本文件正是之前 Android 上 worklets 无限递归、原生闪退的根因。
    presets: ['babel-preset-expo'],
  };
};
