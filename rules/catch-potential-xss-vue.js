'use strict';

const utils = require('../utils');
const get = require('lodash.get');

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVHTML = node => {
	const { name } = node;
	if (name === 'html' || name.name === 'html') return true;
	return false;
};

const isPropertySafe = (node, isVariableTrusted) => {
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
			isVariableTrusted[name] = utils.isCallExpressionSafe(
				value,
				isVariableTrusted
			);
			break;
		case 'MemberExpression':
			isVariableTrusted[name] = isMemberExpressionSafe(
				value,
				isVariableTrusted
			);
			break;
	}
};

const isObjectExpressionSafe = (node, isVariableTrusted) => {
	const properties = get(node, 'properties', []);
	for (const property of properties) {
		if (!isPropertySafe(property, isVariableTrusted)) {
			return false;
		}
	}
	return true;
};

const isMemberExpressionSafe = (node, isVariableTrusted) => {
	const { object, property } = node;
	switch (property.type) {
		case 'Literal':
			return isVariableTrusted[object.name];
		case 'Identifier':
			return isVariableTrusted[property.name];
	}
};

const isArrayExpressionSafe = (node, isVariableTrusted) => {
	const { elements } = node;
	for (const element of elements) {
		switch (element.type) {
			case 'Literal':
				return false;
			case 'Identifier':
				return isVariableTrusted[element.name];
			case 'CallExpression':
				return utils.isCallExpressionSafe(element, isVariableTrusted);
			case 'MemberExpression':
				return isMemberExpressionSafe(element, isVariableTrusted);
		}
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
						isVariableTrusted[name] = utils.isCallExpressionSafe(
							value,
							isVariableTrusted
						);
						break;
					case 'MemberExpression':
						isVariableTrusted[name] = isMemberExpressionSafe(
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
							isVariableTrusted[node.id.name] = utils.isCallExpressionSafe(
								node.init
							);
							break;
						case 'ArrayExpression':
							isVariableTrusted[node.id.name] = isArrayExpressionSafe(
								node.init,
								isVariableTrusted
							);
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
						isVariableTrusted[node.left.name] = utils.isCallExpressionSafe(
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
