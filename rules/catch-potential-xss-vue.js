'use strict';

const utils = require('./utils');
const get = require('lodash.get');
const cloneDeep = require('lodash.clonedeep')

const DANGEROUS_MESSAGE = 'XSS potentially found: use of v-html.';

const isVHTML = node => {
  const { name } = node;
  if (name === 'html' || name.name === 'html') return true;
  return false;
};

const postProcessVariablesForVue = (isVariableTrusted) => {
  let newIsVariableTrusted = cloneDeep(isVariableTrusted)
  delete newIsVariableTrusted['computed'];
  delete newIsVariableTrusted['methods'];
  for (var variableName in newIsVariableTrusted) {
    if (variableName.startsWith('computed.')) {
      newIsVariableTrusted[variableName.replace('computed.', '')] = newIsVariableTrusted[variableName];
      delete newIsVariableTrusted[variableName];
    }
    if (variableName.startsWith('methods.')) {
      newIsVariableTrusted[variableName.replace('methods.', '')] = newIsVariableTrusted[variableName];
      delete newIsVariableTrusted[variableName];
    }
  }

  return newIsVariableTrusted
}

const create = context => {
  let isVariableTrusted = {};
  // The script visitor is called first. Then the template visitor
  return utils.defineTemplateBodyVisitor(
    context,
    // Event handlers for <template>
    {
      VAttribute(node) {
        try {
          const { key, value } = node;
          if (isVHTML(key)) {
            if (get(node, 'value.type', '') === 'VExpressionContainer') {
              const { expression } = value;
              if (expression && expression !== null) {
                const variableName = utils.getNameFromExpression(expression);
                if(!utils.isVariableSafe(variableName, isVariableTrusted, [])) {
                  context.report(node, DANGEROUS_MESSAGE);
                }
              } else {
                context.report(node, DANGEROUS_MESSAGE);
              }
            } else {
              context.report(node, DANGEROUS_MESSAGE);
            }
          }
        } catch (error) {
          context.report(node, `${utils.ERROR_MESSAGE} \n ${error.stack}`);
        }
      },
    },
    // Event handlers for <script> or scripts
    {
      Program(node) {
        try {
          isVariableTrusted = utils.checkProgramNode(node);
          isVariableTrusted = postProcessVariablesForVue(isVariableTrusted)
        } catch (error) {
          context.report(node, `${utils.ERROR_MESSAGE} \n ${error.stack}`);
        }
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
