import typescriptPlugin from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  typescriptPlugin.configs.eslintRecommended,
  ...typescriptPlugin.configs.recommended,
  prettierConfig,
  {
    plugins: {
      "@typescript-eslint": typescriptPlugin.plugin,
      prettier: prettierPlugin,
    },
    rules: {
      "max-len": [
        "warn",
        {
          code: 140,
        },
      ],
      "prettier/prettier": [
        "error",
        {
          printWidth: 120,
          tabWidth: 2,
          singleQuote: false,
          arrowParens: "always",
          semi: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      curly: "error",
      "default-case": "error",
      "no-console": "warn",
    },
  },
];
