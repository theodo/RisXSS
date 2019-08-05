# 🛡RisXSS

Eradicate all XSS flaws of your React application using a single ESLint rule.

## Install

```
$ yarn add eslint eslint-plugin-risxss --dev
```

# Configuration

Configure it in `.eslintrc.js`.

```js
module.exports = {
  env: {
    browser: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  extends: "eslint:recommended",
  parserOptions: {
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: "module"
  },
  plugins: ["risxss"],
  rules: {
    "risxss/catch-potential-xss": "error",
  }
};

```

## Rules

- [catch-potential-xss](docs/rules/catch-potential-xss.md) - Enforce the use of dompurify when using dangerouslySetInnerHtml

## License

MIT
