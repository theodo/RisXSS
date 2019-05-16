# eslint-plugin-risxss

> Various ESLint rules to prevent XSS

## Install

```
$ yarn add eslint eslint-plugin-risxss --dev
```

## Usage

Configure it in `package.json`.

```json
{
	"name": "my-awesome-project",
	"eslintConfig": {
		"env": {
			"es6": true
		},
		"parserOptions": {
			"ecmaVersion": 2019,
			"sourceType": "module"
		},
		"plugins": [
			"risxss"
		],
		"rules": {
			"risxss/catch-potential-xss": "error",
		}
	}
}
```

## Rules

- [catch-potential-xss](docs/rules/catch-potential-xss.md) - Enforce the use of dompurify when using dangerouslySetInnerHtml

## License

MIT
