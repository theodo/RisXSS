// eslint/index.js

const lodash = require("lodash");

module.exports = {
  rules: {
    "incorrect-use-of-dompurify": {
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

        function getPayloadObjectExpression(node) {
          return lodash.get(node, "parent.value.expression");
        }

        function isCallExpressionSafe(node) {
          return (
            lodash.get(node, "callee.object.name", "") === "DOMPurify" &&
            lodash.get(node, "callee.property.name", "") === "sanitize"
          );
        }

        function checkObjectExpression(node) {
          let objectExpression = getPayloadObjectExpression(node);
          let htmlProperty = lodash
            .get(objectExpression, "properties", [])
            .filter(
              property => lodash.get(property, "key.name", "") === "__html"
            );
          if (htmlProperty.length !== 1) {
            return context.report(
              node,
              "dangerouslySetInnerHTML is not used correctly, its argument should be of type { __html: ... }"
            );
          }
          // soit c'est un Identifier
          switch (htmlProperty[0].value.type) {
            case "Identifier":
              context.report(node, "Identifier detected");
              break;
            case "CallExpression":
              context.report(node, "CallExpression detected");
              break;
            default:
              context.report(node, "Unexpected value type detected");
              break;
          }
          // soit c'est un CallExpression avec appel de DOMPurify
          context.report(node, htmlProperty[0].value.type);
        }

        return {
          JSXIdentifier: function(node) {
            if (isDangerouslySetInnerHTMLNode(node)) {
              context.report(node, "detected dangerouslySetInnerHTML");
              if (isPayloadObjectExpression(node)) {
                context.report(node, "ObjectExpression type");
                checkObjectExpression(node);
              }
              if (isPayloadIdentifier(node)) {
                // context.report(node, "Identifier type");
              }
            }
            context.report(node, "----");
          }
        };
      }
    }
  }
};
