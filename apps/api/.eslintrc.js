module.exports = {
  root: true,
  extends: ['@inventory-mgmt/eslint-config/nest.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
};
