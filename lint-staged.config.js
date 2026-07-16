const path = require('path');

/**
 * Plain `eslint --fix` from the repo root cannot resolve each app's tsconfig
 * path aliases (e.g. apps/web's `@/*`) correctly, which silently produces
 * different — sometimes contradictory — autofixes than running lint from
 * the package itself (as `pnpm lint` / CI do). Run eslint scoped to each
 * package's own directory instead, matching how it's actually linted.
 */
function scopedEslintFix(packageDir, filterName) {
  return (files) => {
    const relativeFiles = files.map((file) =>
      path.relative(path.resolve(__dirname, packageDir), file),
    );
    return [`pnpm --filter ${filterName} exec eslint --fix ${relativeFiles.join(' ')}`];
  };
}

module.exports = {
  'apps/web/**/*.{ts,tsx}': scopedEslintFix('apps/web', '@inventory-mgmt/web'),
  'apps/api/**/*.ts': scopedEslintFix('apps/api', '@inventory-mgmt/api'),
  'packages/shared-types/**/*.ts': scopedEslintFix(
    'packages/shared-types',
    '@inventory-mgmt/shared-types',
  ),
  'packages/database/**/*.ts': scopedEslintFix('packages/database', '@inventory-mgmt/database'),
  '*.{ts,tsx,js,jsx,json,md}': ['prettier --write'],
};
