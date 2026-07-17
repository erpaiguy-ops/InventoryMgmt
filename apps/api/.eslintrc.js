module.exports = {
  root: true,
  extends: ['@inventory-mgmt/eslint-config/nest.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  overrides: [
    {
      // v2 tenant-scoped services must go through SupabaseService's
      // selectTenant/insertTenant/updateTenant/deleteTenant helpers so
      // tenant_id filtering can never be forgotten at a call site. The
      // owner module is exempt: organizations/platform_owners aren't
      // tenant-scoped, so it legitimately needs the raw client.
      files: ['src/modules/**/*.service.ts'],
      excludedFiles: ['src/modules/owner/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.property.name='getTable']",
            message:
              'Use selectTenant/insertTenant/updateTenant/deleteTenant for tenant-scoped queries instead of getTable() directly.',
          },
          {
            // Only bans getClient().from(...) table-query chains — getClient().auth.*
            // (GoTrue admin API: createUser, updateUserById, etc.) is a legitimate,
            // non-table-query use every tenant-facing service needs for account
            // provisioning, and isn't a tenant-scoping concern at all.
            selector:
              "CallExpression[callee.property.name='from'][callee.object.callee.property.name='getClient']",
            message:
              'Use selectTenant/insertTenant/updateTenant/deleteTenant instead of getClient().from(...) for tenant-scoped table queries.',
          },
        ],
      },
    },
  ],
};
