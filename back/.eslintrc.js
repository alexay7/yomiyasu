module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: "es2019",
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    "plugin:@darraghor/nestjs-typed/recommended"
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@darraghor/nestjs-typed/should-specify-forbid-unknown-values': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    "quotes": [2, "double", { "avoidEscape": true }],

    '@typescript-eslint/interface-name-prefix': 'off',

    '@typescript-eslint/explicit-function-return-type': 'off',

    '@typescript-eslint/explicit-module-boundary-types': 'off',

    '@typescript-eslint/no-explicit-any': 'off',

    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",

    "@typescript-eslint/no-unnecessary-type-assertion": "warn",

    "@typescript-eslint/no-unnecessary-type-constraint": "warn",

    "@typescript-eslint/no-for-in-array": "error",

    "@typescript-eslint/prefer-as-const": "error",

    "@typescript-eslint/consistent-type-assertions": "error",

    "@typescript-eslint/adjacent-overload-signatures": "warn",

    "@typescript-eslint/prefer-literal-enum-member": ["error"],

    "@typescript-eslint/no-duplicate-enum-values": ["error"],

    "@typescript-eslint/switch-exhaustiveness-check": ["error"],

    "@typescript-eslint/await-thenable": "error",

    "@typescript-eslint/prefer-readonly": ["warn"],

    "@typescript-eslint/no-namespace": ["warn"],

    "default-param-last": "off",
    "@typescript-eslint/default-param-last": ["error"],

    "no-empty-function": "off",
    "@typescript-eslint/no-empty-function": ["error"],

    "require-await": "off",
    "@typescript-eslint/require-await": "error",

    "no-return-await": "off",
    "@typescript-eslint/return-await": "error",

    "no-throw-literal": "off",
    "@typescript-eslint/no-throw-literal": ["error"],

    "no-unused-expressions": "off",
    "@typescript-eslint/no-unused-expressions": ["error"],

    "no-shadow": "off",
    "@typescript-eslint/no-shadow": ["error"],

    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],

    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": ["error"],

    "no-redeclare": "off",

    "no-array-constructor": "off",
    "@typescript-eslint/no-array-constructor": ["error"],

    "dot-notation": "off",
    "@typescript-eslint/dot-notation": ["error"],

    "object-curly-spacing": "off",
    "@typescript-eslint/object-curly-spacing": ["error"],

    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": ["error"],

    "no-dupe-class-members": "off",
    "@typescript-eslint/no-dupe-class-members": ["error"],

    "no-invalid-this": "off",
    "@typescript-eslint/no-invalid-this": ["error"],

    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": ["error"],

    "no-duplicate-imports": "off",
    "@typescript-eslint/no-duplicate-imports": ["error"],

    "no-implied-eval": "off",
    "@typescript-eslint/no-implied-eval": ["error"],

    "no-extra-semi": "off",
    "@typescript-eslint/no-extra-semi": ["error"],

    "semi": "off",
    "@typescript-eslint/semi": ["error"],

    "indent": "off",
    "@typescript-eslint/indent": ["error", 4, { "ignoredNodes": ["PropertyDefinition"] }],

    "quotes": "off",
    "@typescript-eslint/quotes": ["error", "double"],

    "comma-spacing": "off",
    "@typescript-eslint/comma-spacing": ["error"],

    "comma-dangle": "off",
    "@typescript-eslint/comma-dangle": ["error"],

    "brace-style": "off",

    "keyword-spacing": "off",
    "@typescript-eslint/keyword-spacing": ["error"],

    "space-infix-ops": "off",
    "@typescript-eslint/space-infix-ops": ["error", { "int32Hint": false }],

    "space-before-function-paren": "off",
    "@typescript-eslint/space-before-function-paren": ["error", "never"],

    "space-before-blocks": "off",
    "@typescript-eslint/space-before-blocks": ["error"],

    "@darraghor/nestjs-typed/injectable-should-be-provided": "off",

    "@darraghor/nestjs-typed/validated-non-primitive-property-needs-type-decorator": "off"
  },
  plugins: ["@darraghor/nestjs-typed"]
};