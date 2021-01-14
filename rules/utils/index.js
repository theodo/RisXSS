'use-strict';

const ERROR_MESSAGE = 'The linter couldn\'t lint the file properly, please open an issue on the RisXSS repo. \n The error is : ';

const get = require('lodash.get');
const union = require('lodash.union');
const cloneDeep = require('lodash.clonedeep');

const isLibraryTrusted = (source) => {
  return source === 'dompurify';
};

// warning, this function mutate the array isVariableTrusted
const checkNode = (currentNode, isVariableTrusted, variableNameToBeAssigned = '') => {
  if (!currentNode) {
    return;
  }
  switch (get(currentNode, 'type', '')) {
    case 'Program' :
      for (const nextNode of currentNode.body) {
        checkNode(nextNode, isVariableTrusted);
      }
      break;
    // Classes
    case 'ClassDeclaration':
      checkNode(currentNode.body, isVariableTrusted);
      break;
    case 'ClassBody':
      for (const nextNode of currentNode.body) {
        checkNode(nextNode, isVariableTrusted);
      }
      break;
    // Declarations
    case 'ImportDeclaration':
      const { specifiers, source } = currentNode;
      for (const specifier of specifiers) {
        const name = get(specifier, 'local.name', '');
        if (name !== '') {
          updateIsVariableTrusted(isVariableTrusted, name, { value: isLibraryTrusted(source.value), dependsOn: [] });
        }
      }
      break;
    case 'ExportDefaultDeclaration':
    case 'ExportNamedDeclaration':
      checkNode(currentNode.declaration, isVariableTrusted);
      break;
    case 'VariableDeclaration':
      for (const nextNode of currentNode.declarations) {
        checkNode(nextNode, isVariableTrusted);
      }
      break;
    case 'VariableDeclarator':
      checkVariableDeclarator(currentNode, isVariableTrusted);
      break;
    case 'FunctionDeclaration':
      checkNode(currentNode.body, isVariableTrusted);
      if (currentNode.id) {
        updateIsVariableTrusted(
          isVariableTrusted,
          currentNode.id.name,
          checkReturnsInStatement(currentNode.body, isVariableTrusted),
        );
      }
      break;
    case 'MethodDefinition':
      checkNode(currentNode.value, isVariableTrusted);
      break;
    // Statements and Clauses
    case 'BlockStatement':
      for (const nextNode of currentNode.body) {
        checkNode(nextNode, isVariableTrusted);
      }
      break;
    case 'IfStatement':
      checkNode(currentNode.consequent, isVariableTrusted);
      checkNode(currentNode.alternate, isVariableTrusted);
      break;
    case 'SwitchStatement':
      for (const switchCase of currentNode.cases) {
        checkNode(switchCase, isVariableTrusted);
      }
      break;
    case 'SwitchCase':
      for (const consequent of currentNode.consequent) {
        checkNode(consequent, isVariableTrusted);
      }
      break;
    case 'TryStatement':
      checkNode(currentNode.block, isVariableTrusted);
      checkNode(currentNode.handler, isVariableTrusted);
      break;
    case 'CatchClause':
      checkNode(currentNode.body, isVariableTrusted);
      break;
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
      checkNode(currentNode.body, isVariableTrusted);
      break;
    case 'ExpressionStatement':
      return checkNode(currentNode.expression, isVariableTrusted, variableNameToBeAssigned);
    // Expressions
    case 'AssignmentExpression':
      const variableName = getNameFromExpression(currentNode.left);
      updateIsVariableTrusted(
        isVariableTrusted,
        variableName,
        checkNode(currentNode.right, isVariableTrusted, variableName),
      );
      break;
    case 'ArrayExpression':
      return checkArrayExpression(currentNode, isVariableTrusted);
    case 'ObjectExpression':
      return checkObjectExpression(currentNode, isVariableTrusted, variableNameToBeAssigned);
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      checkNode(currentNode.body, isVariableTrusted);
      return checkReturnsInStatement(currentNode.body, isVariableTrusted);
    case 'SequenceExpression':
      for (const nextNode of currentNode.expressions) {
        checkNode(nextNode, isVariableTrusted);
      }
      break;
    case 'ConditionalExpression':
      return mergeTrustObjects(
        checkNode(currentNode.consequent, isVariableTrusted),
        checkNode(currentNode.alternate, isVariableTrusted),
      );
    case 'CallExpression':
      return { value: undefined, dependsOn: [getNameFromExpression(currentNode)] };
    case 'MemberExpression':
      return { value: undefined, dependsOn: [getNameFromMemberExpression(currentNode)] };
    // Miscellaneous
    case 'Literal':
      if (currentNode.value === '' || currentNode.value === null) {
        return { value: true, dependsOn: [] };
      }
      return { value: false, dependsOn: [] };
    case 'Identifier':
      return { value: undefined, dependsOn: [currentNode.name] };
    // Pattern (to be done)
    default:
      return { value: undefined, dependsOn: [] };
  }
};

const checkVariableDeclarator = (node, isVariableTrusted) => {
  switch (get(node, 'id.type', '')) {
    case 'Identifier' :
      const variableName = get(node, 'id.name', '');
      updateIsVariableTrusted(
        isVariableTrusted,
        variableName,
        checkNode(get(node, 'init', null), isVariableTrusted, variableName),
      );
      break;
    case 'ObjectPattern':
      const objectName = getNameFromExpression(get(node, 'init', null));
      if (!objectName) {
        return;
      }
      const properties = get(node, 'id.properties', []);
      for (const property of properties) {
        const propertyName = get(property, 'key.name', null);
        if (propertyName) {
          updateIsVariableTrusted(
            isVariableTrusted,
            propertyName,
            { value: undefined, dependsOn: [`${objectName}.${propertyName}`] },
          );
        }
      }
      break;
  }
};

const checkArrayExpression = (node, isVariableTrusted) => {
  let returnedTrustObject = { value: true, dependsOn: [] };
  const elements = get(node, 'elements', []);
  for (const element of elements) {
    let elementTrustObject = checkNode(element, isVariableTrusted);
    returnedTrustObject = mergeTrustObjects(returnedTrustObject, elementTrustObject);
  }

  return returnedTrustObject;
};

const checkObjectExpression = (node, isVariableTrusted, variableNameToBeAssigned) => {
  let returnedTrustObject = { value: true, dependsOn: [] };
  const properties = get(node, 'properties', []);
  for (const property of properties) {
    if (property.type === 'SpreadElement' || property.type === 'ExperimentalSpreadProperty') {
      continue;
    }
    if (!get(property, 'key', false) || !get(property, 'value', false)) {
      continue;
    }
    let propertyVariableName;
    if (variableNameToBeAssigned === '') {
      propertyVariableName = getNameFromExpression(property.key);
    } else {
      propertyVariableName = `${variableNameToBeAssigned}.${getNameFromExpression(property.key)}`;
    }
    let propertyTrustObject = checkNode(property.value, isVariableTrusted, propertyVariableName);
    updateIsVariableTrusted(isVariableTrusted, propertyVariableName, propertyTrustObject);
    returnedTrustObject = mergeTrustObjects(returnedTrustObject, propertyTrustObject);
  }

  return returnedTrustObject;
};

const checkReturnsInStatement = (currentNode, isVariableTrusted) => {
  let returnedTrustObject = { value: true, dependsOn: [] };
  if (!currentNode) {
    return returnedTrustObject;
  }
  switch (get(currentNode, 'type', '')) {
    case 'ReturnStatement':
      return checkNode(currentNode.argument, isVariableTrusted);
    case 'BlockStatement':
      for (const consequent of currentNode.body) {
        returnedTrustObject = mergeTrustObjects(
          returnedTrustObject,
          checkReturnsInStatement(consequent, isVariableTrusted),
        );
        if (returnedTrustObject.value === false) {
          return returnedTrustObject;
        }
      }
      return returnedTrustObject;
    case 'IfStatement':
      return mergeTrustObjects(
        checkReturnsInStatement(currentNode.consequent, isVariableTrusted),
        checkReturnsInStatement(currentNode.alternate, isVariableTrusted),
      );
    case 'DoWhileStatement':
    case 'WhileStatement':
    case 'ForStatement':
      return checkReturnsInStatement(currentNode.body, isVariableTrusted);
    case 'SwitchStatement':
      for (const switchCase of currentNode.cases) {
        returnedTrustObject = mergeTrustObjects(
          returnedTrustObject,
          checkReturnsInStatement(switchCase, isVariableTrusted),
        );
        if (returnedTrustObject.value === false) {
          return returnedTrustObject;
        }
      }
      return returnedTrustObject;
    case 'SwitchCase':
      for (const consequent of currentNode.consequent) {
        returnedTrustObject = mergeTrustObjects(
          returnedTrustObject,
          checkReturnsInStatement(consequent, isVariableTrusted),
        );
        if (returnedTrustObject.value === false) {
          return returnedTrustObject;
        }
      }
      return returnedTrustObject;
    default:
      return returnedTrustObject;
      ;
  }
};

const getNameFromExpression = (expression) => {
  switch (get(expression, 'type', '')) {
    case 'Literal':
      return expression.value;
    case 'Identifier':
      return expression.name;
    case 'MemberExpression':
      return getNameFromMemberExpression(expression);
    case 'CallExpression':
      return getNameFromExpression(expression.callee);
  }
};

const getNameFromMemberExpression = (memberExpression) => {
  const { object, property } = memberExpression;
  let objectName = '';
  let propertyName = '';
  switch (get(object, 'type', '')) {
    case 'Literal':
      objectName = object.value;
      break;
    case 'Identifier':
      objectName = object.name;
      break;
    case 'MemberExpression':
      objectName = getNameFromMemberExpression(object);
      break;
  }
  switch (get(property, 'type', '')) {
    case 'Literal':
      // if the value is a string we are trying to access the property of an object, if not the value will be a number to access index of array
      if (typeof (property.value) === 'string') {
        propertyName = property.value;
      }
      break;
    case 'Identifier':
      propertyName = property.name;
      break;
  }

  if (propertyName === '') {
    return objectName;
  }

  return `${objectName}.${propertyName}`;
};

const mergeTrustObjects = (firstObject, secondObject) => {
  if (!firstObject || !secondObject) {
    return firstObject || secondObject || {};
  }
  let results = {};
  if (secondObject.value === false) {
    results.value = false;
  } else if (secondObject.value === undefined) {
    if (firstObject.value === false) {
      results.value = false;
    } else {
      results.value = undefined;
    }
  } else {
    results.value = firstObject.value;
  }
  // To do : add unicity in the merge
  results.dependsOn = union(firstObject.dependsOn, secondObject.dependsOn);

  return results;
};

const updateIsVariableTrusted = (isVariableTrusted, variableName, isAssignementTrusted) => {
  if (!get(isVariableTrusted, variableName, undefined)) {
    isVariableTrusted[variableName] = isAssignementTrusted;
  } else {
    isVariableTrusted[variableName] = mergeTrustObjects(isVariableTrusted[variableName], isAssignementTrusted);
  }
};

// already seen variables are here to prevent the funcion to loop infinitely
const isVariableSafe = (variableName, isVariableTrusted, alreadySeenVariables) => {
  const trustObject = get(isVariableTrusted, variableName, undefined);
  if (!trustObject || alreadySeenVariables.includes(variableName)) {
    return false;
  }
  if (trustObject.value !== undefined) {
    return trustObject.value;
  }
  alreadySeenVariables.push(variableName);
  for (const nextVariableToCheck of trustObject.dependsOn) {
    if (!isVariableSafe(nextVariableToCheck, isVariableTrusted, alreadySeenVariables)) {
      return false;
    }
  }

  return true;
};

const getTrustedCall = (options) => {
  let trustedCalls = { 'DOMPurify.sanitize': { value: true, dependsOn: [] } };
  for (callName of get(options, 'trustedCalls', [])) {
    trustedCalls[callName] = { value: true, dependsOn: [] };
  }

  return trustedCalls;
};

const checkProgramNode = (node, isVariableTrusted) => {
  let newIsVariableTrusted = cloneDeep(isVariableTrusted);
  checkNode(node, newIsVariableTrusted);

  return newIsVariableTrusted;
};

module.exports = {
  ERROR_MESSAGE,
  defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor) {
    if (context.parserServices.defineTemplateBodyVisitor == null) {
      context.report({
        loc: { line: 1, column: 0 },
        message:
          'Use the latest vue-eslint-parser. See also https://vuejs.github.io/eslint-plugin-vue/user-guide/#what-is-the-use-the-latest-vue-eslint-parser-error',
      });
      return {};
    }
    return context.parserServices.defineTemplateBodyVisitor(
      templateBodyVisitor,
      scriptVisitor,
    );
  },
  getNameFromExpression,
  isVariableSafe,
  checkProgramNode,
  checkNode,
  getTrustedCall,
};
