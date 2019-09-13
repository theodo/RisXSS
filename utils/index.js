'use-strict';

const get = require('lodash.get');

module.exports = {
	defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor) {
		if (context.parserServices.defineTemplateBodyVisitor == null) {
			context.report({
				loc: { line: 1, column: 0 },
				message:
					'Use the latest vue-eslint-parser. See also https://vuejs.github.io/eslint-plugin-vue/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error'
			});
			return {};
		}
		return context.parserServices.defineTemplateBodyVisitor(
			templateBodyVisitor,
			scriptVisitor
		);
	},
	isCallExpressionSafe(node) {
		return (
			get(node, 'callee.object.name', '') === 'DOMPurify' &&
			get(node, 'callee.property.name', '') === 'sanitize'
		);
	}
};
