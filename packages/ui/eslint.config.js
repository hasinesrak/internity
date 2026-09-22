//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    // Vendored registry source (shadcn + beUI) is kept as installed, per
    // docs/design-system.md. These rules fire on defensive runtime checks and
    // generic naming the registries wrote on purpose, so they stay as written.
    files: [
      "src/components/**",
      "src/lib/hooks/**",
      "src/lib/command-search.ts",
      "src/lib/ease.ts",
      "src/lib/presence-gate.tsx",
      "src/lib/touch.ts",
      "src/lib/utils.ts",
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/naming-convention": "off",
      "no-shadow": "off",
    },
  },
  {
    ignores: ["eslint.config.js", ".prettierrc"],
  },
]
