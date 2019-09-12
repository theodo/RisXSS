'use strict';

const utils = require('../utils');
const get = require('lodash.get');

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVHTML = node => {
	const { name } = node;
	if (name === 'html' || name.name === 'html') return true;
	return false;
};

const isCallExpressionSafe = node =>
	get(node, 'callee.object.name', '') === 'DOMPurify' &&
	get(node, 'callee.property.name', '') === 'sanitize';

const isObjectExpressionSafe = (node, isVariableTrusted) => {
	const htmlProperty = get(node, 'properties', []).filter(
		property => get(property, 'key.name', '') === '__html'
	);
	if (htmlProperty.length !== 1) {
		return false;
	}

	switch (htmlProperty[0].value.type) {
		case 'CallExpression':
			return isCallExpressionSafe(htmlProperty[0].value);
		case 'Identifier':
			return isVariableTrusted[htmlProperty[0].value.name];
		default:
			return false;
	}
};

const create = context => {
	const isVariableTrusted = {};
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
									if (!isVariableTrusted[expression.name]) {
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
					value
				} = node;
				switch (value.type) {
					case 'Literal':
						isVariableTrusted[name] = false;
						break;
					case 'Identifier':
						isVariableTrusted[name] = isVariableTrusted[value.name];
						break;
					case 'CallExpression':
						isVariableTrusted[name] = isCallExpressionSafe(
							value,
							isVariableTrusted
						);
						break;
				}
			},
			VariableDeclarator(node) {
				if (node.init) {
					switch (node.init.type) {
						case 'Literal':
							isVariableTrusted[node.id.name] = false;
							break;
						case 'ObjectExpression':
							isVariableTrusted[node.id.name] = isObjectExpressionSafe(
								node.init,
								isVariableTrusted
							);
							break;
						case 'CallExpression':
							isVariableTrusted[node.id.name] = isCallExpressionSafe(node.init);
							break;
						default:
							isVariableTrusted[node.id.name] = false;
							break;
					}
				} else {
					isVariableTrusted[node.id.name] = false;
				}
			},
			AssignmentExpression: node => {
				switch (node.right.type) {
					case 'Literal':
						isVariableTrusted[node.left.name] = false;
						break;
					case 'ObjectExpression':
						isVariableTrusted[node.left.name] = isObjectExpressionSafe(
							node.right,
							isVariableTrusted
						);
						break;
					case 'CallExpression':
						isVariableTrusted[node.left.name] = isCallExpressionSafe(
							node.right
						);
						break;
					default:
						isVariableTrusted[node.left.name] = false;
						break;
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
