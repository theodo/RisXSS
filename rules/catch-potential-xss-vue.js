'use strict';

const utils = require('../utils');

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVElementSafe = velement => {
	if (velement.type !== 'VElement') {
		return true;
	}
	let isSafe = true;
	const { attributes } = velement.startTag;
	if (attributes.length > 0) {
		for (const attribute of attributes) {
			const {
				key: {
					type,
					name: { name }
				}
			} = attribute;
			if (type === 'VDirectiveKey' && name === 'html') {
				isSafe = false;
			}
		}
	}
	return isSafe;
};

const create = context => {
	return utils.defineTemplateBodyVisitor(
		context,
		// Event handlers for <template>
		{
			VElement(node) {
				if (!isVElementSafe(node)) {
					context.report(node, DANGEROUS_MESSAGE);
				}
			}
		},
		// Event handlers for <script> or scripts
		{
			Program(node) {}
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
