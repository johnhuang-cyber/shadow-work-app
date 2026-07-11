/** @type {import('jest').Config} */
const expoBabelPreset = require.resolve('expo/internal/babel-preset');

module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.test.ts'],
      transform: {
        '^.+\\.[jt]sx?$': [
          'babel-jest',
          {
            presets: [expoBabelPreset],
          },
        ],
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
  ],
};
