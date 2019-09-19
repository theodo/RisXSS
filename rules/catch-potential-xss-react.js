'use strict';

const utils = require('./utils');
const get = require('lodash.get');

const DANGEROUS_MESSAGE =
  'XSS potentially found, unsecure use of dangerouslySetInnerHTML';

const payloadTypeDangerouslySetInnerHTML = node =>
  get(node, 'parent.value.expression.type');

const isPayloadIdentifier = node =>
  payloadTypeDangerouslySetInnerHTML(node) === 'Identifier';

const isPayloadObjectExpression = node =>
  payloadTypeDangerouslySetInnerHTML(node) === 'ObjectExpression';

const isDangerouslySetInnerHTMLNode = node => {
  return (
    get(node, 'name', '') === 'dangerouslySetInnerHTML' &&
    get(node, 'parent.type', '') === 'JSXAttribute' &&
    get(node, 'parent.value.type', '') === 'JSXExpressionContainer'
  );
};

const isObjectExpressionSafe = (node, isVariableTrusted) => {
  const htmlProperty = get(node, 'properties', []).filter(
    property => get(property, 'key.name', '') === '__html'
  );
  if (htmlProperty.length !== 1) {
    return false;
  }

  switch (htmlProperty[0].value.type) {
    case 'CallExpression':
      return utils.isCallExpressionSafe(htmlProperty[0].value);
    case 'Identifier':
      return isVariableTrusted[htmlProperty[0].value.name];
    default:
      return false;
  }
};

const create = context => {
  const isVariableTrusted = {};
  return {
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
    },
    JSXIdentifier: node => {
      if (isDangerouslySetInnerHTMLNode(node)) {
        if (
          isPayloadObjectExpression(node) &&
          !isObjectExpressionSafe(
            node.parent.value.expression,
            isVariableTrusted
          )
        ) {
          context.report(node, DANGEROUS_MESSAGE);
        }

        if (
          isPayloadIdentifier(node) &&
          !isVariableTrusted[node.parent.value.expression.name]
        ) {
          context.report(node, DANGEROUS_MESSAGE);
        }
      }
    }
  };
};

module.exports = {
  create,
  meta: {
    type: 'suggestion',
    fixable: 'code'
  }
};
