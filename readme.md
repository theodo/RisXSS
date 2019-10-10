# 🛡RisXSS

Eradicate all XSS flaws of your React or Vue application using a single ESLint rule.

![Example](https://media.giphy.com/media/kyF8BJQIlATkUNMpdk/giphy.gif)

## How to install RisXSS ?

- First, use your favorite package manager to add eslint-plugin-risxss in your devDependencies, for example with yarn :

```
yarn add eslint-plugin-risxss --dev
```

- Then, you just have to add the tailored rule for your projet (React or Vue) :

  - risxss/catch-potential-xss-react for React project
  - risxss/catch-potential-xss-vue for Vue project

To do so, add these lines in your eslint config, for instance if you use `.eslintrc.js` config file :

If your project uses React/Javascript :

```javascript
module.exports = {
    env: {
        browser: true,
        es6: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    plugins: ['react', 'risxss'],      //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-react': 'error'  //  <<< add this in rules
    }
};
```

If your project uses React/TypeScript :

```javascript
module.exports = {
    env: {
        browser: true,
        es6: true
    },
    parser: '@typescript-eslint/parser',
    extends: 'eslint:recommended',
    parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    plugins: ['risxss'],   //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-react': 'error'   //  <<< add this in rules
    }
};
```

If your project uses Vue.js

```javascript
module.exports = {
    env: {
        browser: true
    },
    extends: ['plugin:vue/essential'],
    parserOptions: {
        parser: 'babel-eslint'
    },
    plugins: ['vue', 'risxss'],   //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-vue': 'error'   //  <<< add this in rules
    }
};
```

## Rules

- [catch-potential-xss-react](docs/rules/catch-potential-xss-react.md) - Enforce the use of dompurify when using dangerouslySetInnerHtml
- [catch-potential-xss-vue](docs/rules/catch-potential-xss-vue.md) - Enforce the use of dompurify when using v-html

## Configuring the rules

Sometimes you have your own rules to prevent XSS and you don't use DOMPurify.sanitize on your inputs. You can add your own function name to the RisXSS whitelist by passing them as options.

:warning: We still recommand using DOMPurify to sanitize your inputs :warning:

```javascript
module.exports = {
    env: {
        browser: true
    },
    extends: ['plugin:vue/essential'],
    parserOptions: {
        parser: 'babel-eslint'
    },
    plugins: ['vue', 'risxss'],   //  <<< add risxss in plugins
    rules: {
        'risxss/catch-potential-xss-vue': ['error', {
            trustedCalls: ['mySanitizeFunction', 'sanitizeHelper.sanitize'] //  <<< define your anti XSS function here.
        }]
    }
};
```

## License

MIT
