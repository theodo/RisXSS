# 🛡RisXSS

Eradicate all XSS flaws of your React application using a single ESLint rule.

![Example](https://media.giphy.com/media/kyF8BJQIlATkUNMpdk/giphy.gif)

## Install

```
$ yarn add eslint-plugin-risxss --dev
```

# Configuration

Configure it in `.eslintrc.js`.

If your project only uses React/Javascript :

```js
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
	plugins: ['react', 'risxss'],
	rules: {
		'risxss/catch-potential-xss-react': 'error'
	}
};
```

If your project uses React/TypeScript :

```js
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
	plugins: ['risxss'],
	rules: {
		'risxss/catch-potential-xss-react': 'error'
	}
};
```

If your project uses Vue.js

```js
module.exports = {
	env: {
		browser: true
	},
	extends: ['plugin:vue/essential'],
	parserOptions: {
		parser: 'babel-eslint'
	},
	plugins: ['vue', 'risxss'],
	rules: {
		'risxss/catch-potential-xss-vue': 'error'
	}
};
```

## Rules

- [catch-potential-xss-react](docs/rules/catch-potential-xss-react.md) - Enforce the use of dompurify when using dangerouslySetInnerHtml
- [catch-potential-xss-vue](docs/rules/catch-potential-xss-vue.md) - Enforce the use of dompurify when using v-html

## License

MIT
