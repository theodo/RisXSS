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
  extends: "eslint:recommended",
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: "module"
  },
  plugins: ["react", "risxss"],
  rules: {
    "risxss/potential-xss": "error"
  }
};

```

## Rules

- [catch-potential-xss](docs/rules/catch-potential-xss.md) - Enforce the use of dompurify when using dangerouslySetInnerHtml

## License

MIT
