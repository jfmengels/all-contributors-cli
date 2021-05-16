module.exports = {
  extends: [
    require.resolve('eslint-config-kentcdodds'),
    require.resolve('eslint-config-kentcdodds/jest'),
  ],
  rules: {
    'func-names': 0,
    'babel/camelcase': 0,
    'import/extensions': 0,
    'consistent-return': 0,
    'no-process-exit': 0,
    'no-continue': 0,
  },
}
