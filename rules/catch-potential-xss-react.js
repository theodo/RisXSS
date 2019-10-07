'use strict';

const utils = require('./utils');
const get = require('lodash.get');

const DANGEROUS_MESSAGE =
  'XSS potentially found, unsecure use of dangerouslySetInnerHTML';

const isInnerHTMLObjectExpressionSafe = (objectExpression, isVariableTrusted) => {
  const htmlProperties = get(objectExpression, 'properties', []).filter(
    property => get(property, 'key.name', '') === '__html'
  );
  if (htmlProperties.length !== 1) {
    return false;
  }
  const variableName = utils.getNameFromExpression(htmlProperties[0].value);

  return utils.isVariableSafe(variableName, isVariableTrusted, []);
};

const isDangerouslySetInnerHTMLAttribute = (node) => {
  return get(node, 'name.name', '') === 'dangerouslySetInnerHTML';
}

const create = context => {
  let isVariableTrusted = {};
  return {
    Program(node) {
      isVariableTrusted = utils.checkProgramNode(node);
    },
    JSXAttribute(node) {
      if (isDangerouslySetInnerHTMLAttribute(node)) {
        if (get(node, 'value.type', '') !== 'JSXExpressionContainer') {
          context.report(node, DANGEROUS_MESSAGE);
          return;
        }
        const expression = get(node, 'value.expression', '');
        switch (expression.type) {
          case 'Literal':
            context.report(node, DANGEROUS_MESSAGE);
            break;
          case 'ObjectExpression':
            if (!isInnerHTMLObjectExpressionSafe(expression, isVariableTrusted)) {
              context.report(node, DANGEROUS_MESSAGE);
            }
            break;
          default:
            const variableName = `${utils.getNameFromExpression(expression)}.__html`;
            if(!utils.isVariableSafe(variableName, isVariableTrusted, [])) {
              context.report(node, DANGEROUS_MESSAGE);
            }
        }
      }
    },
  };
};

module.exports = {
  create,
  meta: {
    type: 'suggestion',
    fixable: 'code'
  }
};
