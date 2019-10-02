'use strict';

const utils = require('./utils');
const get = require('lodash.get');

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVHTML = node => {
  const { name } = node;
  if (name === 'html' || name.name === 'html') return true;
  return false;
};

const isLibraryTrusted = (source) => {
  return source === 'dompurify';
};

const isExpressionSafe = (node, isVariableTrusted) => {
  switch (node.type) {
    case 'Literal':
      return false;
    case 'Identifier':
      return isVariableTrusted[node.name];
    case 'CallExpression':
      return utils.isCallExpressionSafe(node, isVariableTrusted);
    case 'MemberExpression':
      return isMemberExpressionSafe(node, isVariableTrusted);
    case 'FunctionExpression':
      return isFunctionExpressionSafe(node, isVariableTrusted);
    case 'ArrowFunctionExpression':
      return isFunctionExpressionSafe(node, isVariableTrusted);
    case 'ObjectExpression':
      return isObjectExpressionSafe(node, isVariableTrusted);
    case 'ArrayExpression':
      return isArrayExpressionSafe(node, isVariableTrusted);
    default:
      return false;
  }
};

const isFunctionExpressionSafe = (node, isVariableTrusted) => {
  return areReturnsInStatementSafe(node.body, isVariableTrusted);
}

const areReturnsInStatementSafe = (node, isVariableTrusted) => {
  if (!node) {
    return true;
  }
  switch (node.type) {
    case 'ReturnStatement':
      return isReturnStatementSafe(node, isVariableTrusted);
    case 'BlockStatement':
      for(const consequent of node.body) {
        if (!areReturnsInStatementSafe(consequent, isVariableTrusted)) {
          return false;
        }
      }
      return true
    case 'IfStatement':
      return areReturnsInStatementSafe(node.consequent, isVariableTrusted) && areReturnsInStatementSafe(node.alternate, isVariableTrusted)
    case 'DoWhileStatement':
    case 'WhileStatement':
    case 'ForStatement':
      return areReturnsInStatementSafe(node.body, isVariableTrusted)
    case 'SwitchStatement':
      for(const switchCase of node.cases) {
        if (!areReturnsInStatementSafe(switchCase, isVariableTrusted)) {
          return false;
        }
      }
      return true
    case 'SwitchCase':
      for(const consequent of node.consequent) {
        if (!areReturnsInStatementSafe(consequent, isVariableTrusted)) {
          return false;
        }
      }
      return true
    default:
      return true;
  }
}

const isReturnStatementSafe = (returnStatement, isVariableTrusted) => {
  return isExpressionSafe(returnStatement.argument, isVariableTrusted);
}

const isObjectExpressionSafe = (node, isVariableTrusted) => {
  const properties = get(node, 'properties', []);
  for (const property of properties) {
    if (!isExpressionSafe(property, isVariableTrusted)) {
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
    if (!isExpressionSafe(element, isVariableTrusted)) {
      return false;
    }
  }
  return true;
};

const create = context => {
  const isVariableTrusted = {};
  // The script visitor is called first. Then the template visitor
  return utils.defineTemplateBodyVisitor(
    context,
    // Event handlers for <template>
    {
      VAttribute(node) {
        const { key, value } = node;
        if (isVHTML(key)) {
          if (get(node, 'value.type', '') === 'VExpressionContainer') {
            const { expression } = value;
            if (expression && expression !== null) {
              if (!isExpressionSafe(expression, isVariableTrusted)) {
                context.report(node, DANGEROUS_MESSAGE);
              }
            } else {
              context.report(node, DANGEROUS_MESSAGE);
            }
          } else {
            context.report(node, DANGEROUS_MESSAGE);
          }
        }
      },
    },
    // Event handlers for <script> or scripts
    {
      ImportDeclaration(node) {
        const { specifiers, source } = node;
        for (const specifier of specifiers) {
          const name = get(specifier, 'local.name', '');
          isVariableTrusted[name] = name === '' ? false : isLibraryTrusted(source.value);
        }
      },
      Property(node) {
        const {
          key: { name },
          value
        } = node;
        isVariableTrusted[name] = isExpressionSafe(value, isVariableTrusted);
      },
      VariableDeclarator(node) {
        if (node.init) {
          isVariableTrusted[node.id.name] = isExpressionSafe(node.init, isVariableTrusted)
        } else {
          isVariableTrusted[node.id.name] = false;
        }
      },
      AssignmentExpression(node) {
        let name;
        if (node.left.type === 'MemberExpression') {
          name = node.left.property.name;
        } else {
          name = node.left.name;
        }
        if (!name) {
          return;
        }
        isVariableTrusted[name] = isExpressionSafe(node.right, isVariableTrusted);
      },
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
