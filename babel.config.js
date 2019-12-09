const buildEnv = {
  plugins: [
    // ['transform-object-rest-spread', { useBuiltIns: true }], // Object.assign is supported by Espruino.
    'transform-es2015-constants',
    // 'transform-es2015-block-scoping', // Throws error: Cannot read property 'bindings' of null
    'transform-es2015-block-scoped-functions',
    'transform-es2015-spread',
    // ['transform-es2015-destructuring', { loose: true }], // Loose assumes we're always destructuring Arrays. Using this to avoid a dependency on Symbol.
    'transform-es2015-parameters',
    'transform-es2015-shorthand-properties'
  ],
  presets: [
    ['@babel/preset-env']
  ]
}

module.exports = function (api) {
  api.cache(true)
  return {
    env: {
      dev: buildEnv,
      production: buildEnv,      
      test: {
        plugins: [
          '@babel/plugin-transform-runtime'
        ],
        presets: [
          ['@babel/preset-env']
        ]
      }
    }
  }
}
