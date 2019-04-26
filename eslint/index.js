// eslint/index.js

const lodash = require("lodash");

module.exports = {
  rules: {
    "potential-xss": {
      create: function(context) {
        /**
         * Check if the node use dangerouslySetInnerHTML
         * @param {ASTNode} node - node to check
         * @returns {boolean} True if dangerouslySetInnerHTML is used
         * @private
         */
        function isDangerouslySetInnerHTMLNode(node) {
          return (
            lodash.get(node, "name", "") === "dangerouslySetInnerHTML" &&
            lodash.get(node, "parent.type", "") === "JSXAttribute" &&
            lodash.get(node, "parent.value.type", "") ===
              "JSXExpressionContainer"
          );
        }

        function payloadTypeDangerouslySetInnerHTML(node) {
          return lodash.get(node, "parent.value.expression.type");
        }

        function isPayloadIdentifier(node) {
          return payloadTypeDangerouslySetInnerHTML(node) === "Identifier";
        }

        function isPayloadObjectExpression(node) {
          return (
            payloadTypeDangerouslySetInnerHTML(node) === "ObjectExpression"
          );
        }

        function isCallExpressionSafe(node) {
          return (
            lodash.get(node, "callee.object.name", "") === "DOMPurify" &&
            lodash.get(node, "callee.property.name", "") === "sanitize"
          );
        }

        function isObjectExpressionSafe(node, isVariableTrusted) {
          let htmlProperty = lodash
            .get(node, "properties", [])
            .filter(
              property => lodash.get(property, "key.name", "") === "__html"
            );
          if (htmlProperty.length !== 1) {
            return false;
          }
          switch (htmlProperty[0].value.type) {
            case "CallExpression":
              return isCallExpressionSafe(htmlProperty[0].value);
            case "Identifier":
              return isVariableTrusted[htmlProperty[0].value.name];
            default:
              return false;
          }
        }
        let isVariableTrusted = {};
        return {
          VariableDeclarator: function(node) {
            console.log("isTrusted : ", isVariableTrusted);
            switch (node.init.type) {
              case "Literal":
                isVariableTrusted[node.id.name] = false;
                break;
              case "ObjectExpression":
                isVariableTrusted[node.id.name] = isObjectExpressionSafe(
                  node.init,
                  isVariableTrusted
                );
                break;
              case "CallExpression":
                isVariableTrusted[node.id.name] = isCallExpressionSafe(
                  node.init
                );
                break;
              default:
                isVariableTrusted[node.id.name] = false;
                break;
            }
          },
          AssignmentExpression: function(node) {
            switch (node.right.type) {
              case "Literal":
                isVariableTrusted[node.left.name] = false;
                break;
              case "ObjectExpression":
                isVariableTrusted[node.id.name] = isObjectExpressionSafe(
                  node.init,
                  isVariableTrusted
                );
                break;
              case "CallExpression":
                isVariableTrusted[node.id.name] = isCallExpressionSafe(node.id);
                break;
              default:
                isVariableTrusted[node.id.name] = false;
                break;
            }
          },
          JSXIdentifier: function(node) {
            if (isDangerouslySetInnerHTMLNode(node)) {
              if (
                isPayloadObjectExpression(node) &&
                !isObjectExpressionSafe(
                  node.parent.value.expression,
                  isVariableTrusted
                )
              ) {
                context.report(
                  node,
                  "XSS potentially found, unsecure use of dangerouslySetInnerHTML"
                );
              }
              if (
                isPayloadIdentifier(node) &&
                !isVariableTrusted[node.parent.value.expression.name]
              ) {
                context.report(
                  node,
                  "XSS potentially found, unsecure use of dangerouslySetInnerHTML"
                );
              }
            }
          }
        };
      }
    }
  }
};
