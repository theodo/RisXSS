'use strict';

const utils = require('../utils');

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVHTML = node => {
	const { name } = node;
	if (name === 'html' || name.name === 'html') return true;
	return false;
};

const create = context => {
	const declaredSafeVariables = {};
	console.log(context.getFilename());

	// The script visitor is called first. Then the template visitor
	return utils.defineTemplateBodyVisitor(
		context,
		// Event handlers for <template>
		{
			VAttribute(node) {
				const { key, value } = node;
				if (isVHTML(key)) {
					if (value && value.type === 'VExpressionContainer') {
						const { expression } = value;
						if (expression && expression !== null) {
							switch (expression.type) {
								case 'Literal':
									context.report(node, DANGEROUS_MESSAGE);
									break;
								case 'Identifier':
									if (!declaredSafeVariables[expression.name]) {
										context.report(node, DANGEROUS_MESSAGE);
									}
									break;
							}
						} else {
							context.report(node, DANGEROUS_MESSAGE);
						}
					} else {
						context.report(node, DANGEROUS_MESSAGE);
					}
				}
			}
		},
		// Event handlers for <script> or scripts
		{
			Property(node) {
				const {
					key: { name },
					value: { callee }
				} = node;
				if (
					callee &&
					callee.object.name === 'DOMPurify' &&
					callee.property.name === 'sanitize'
				) {
					declaredSafeVariables[name] = true;
				}
			}
		}
	);
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		fixable: 'code'
	}
};
