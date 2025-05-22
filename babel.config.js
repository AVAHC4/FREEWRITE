module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add iOS-focused aliases
      [
        "module-resolver",
        {
          alias: {
            "@app": "./",
            "@components": "./components"
          },
        },
      ]
    ]
  };
}; 