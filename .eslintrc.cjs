module.exports = {
  extends: ['@internal/eslint/config/typescript'].map(require.resolve),
  ignorePatterns: ['build', 'front-end'],
};
