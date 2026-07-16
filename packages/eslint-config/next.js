/** ESLint config for the Next.js (apps/web) app. */
module.exports = {
  root: true,
  extends: ['./index.js', 'next/core-web-vitals', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
