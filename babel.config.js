module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@components': './src/components',
            '@features': './src/features',
            '@hooks': './src/hooks',
            '@utils': './src/utils',
            '@types': './src/types'
          },
        },
      ],
    ],
  };
};