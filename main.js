const fs = require("fs");
const glob = require("glob");
const babelParser = require("@babel/parser");

const PROJECT_PATH = "/Users/klausg/component-studio/";
const EXCLUDED_DIRECTORIES_NAMES = [
  "**/node_modules/**",
  "**/flow-typed/**",
  "**/build/**",
  "**/flow/**"
];
const XSS_WHISTLEBLOWER_KEYWORDS = ["dangerouslySetInnerHTML"];

createListOfFilesToCheck = (projetPath, excludedDirectories) => {
  return glob.sync(`${projetPath}**/*.js`, { ignore: excludedDirectories });
};

isFileContainsXSSKeywords = filePath => {
  var content = fs.readFileSync(filePath).toString();
  isFileAtRisk = false;
  XSS_WHISTLEBLOWER_KEYWORDS.some(xssKeywords => {
    if (content.includes(xssKeywords)) {
      isFileAtRisk = true;
    }
  });
  return isFileAtRisk;
};

const filesToCheck = createListOfFilesToCheck(
  PROJECT_PATH,
  EXCLUDED_DIRECTORIES_NAMES
);

atRiskFiles = filesToCheck.filter(path => isFileContainsXSSKeywords(path));

getFlatObject = object => {
  iter = (o, p) => {
    if (Array.isArray(o)) {
      o.forEach(function(a, i) {
        iter(a, p.concat(i));
      });
      return;
    }
    if (o !== null && typeof o === "object") {
      Object.keys(o).forEach(k => {
        iter(o[k], p.concat(k));
      });
      return;
    }
    path[p.join(".")] = o;
  };

  var path = {};
  iter(object, []);
  return path;
};

findKeyJSONValue = (object, value) => {
  return Object.keys(object).filter(key => object[key] === value);
};

splitKey = key => {
  return key.split(".");
};

getObjectNestedKeys = (object, nestedList) => {
  if (nestedList.length == 1) {
    return object[nestedList[0]];
  } else {
    return getObjectNestedKeys(object[nestedList[0]], nestedList.slice(1));
  }
};

isCallExpressionDOMPurified = node => {
  if (!node.hasOwnProperty("callee")) return false;
  if (!node["callee"].hasOwnProperty("object")) return false;
  if (!node["callee"].hasOwnProperty("property")) return false;
  if (!node["callee"]["object"].hasOwnProperty("name")) return false;
  if (!node["callee"]["property"].hasOwnProperty("name")) return false;
  if (node["callee"]["object"]["name"] !== "DOMPurify") return false;
  if (node["callee"]["property"]["name"] !== "sanitize") return false;
  return true;
};

isObjectExpressionDOMPurified = node => {
  if (!node.hasOwnProperty("properties")) return false;
  if (!Array.isArray(node["properties"])) return false;
  if (node["properties"].length !== 1) return false;
  uniqueNode = node["properties"][0];
  if (!uniqueNode.hasOwnProperty("key")) return false;
  key = uniqueNode["key"];
  if (!uniqueNode["key"].hasOwnProperty("name")) return false;
  if (key["name"] !== "__html") return false;
  if (!uniqueNode.hasOwnProperty("value")) return false;
  value = uniqueNode["value"];
  if (!value.hasOwnProperty("type")) return false;
  if (value["type"] !== "CallExpression") return false;
  if (!value.hasOwnProperty("callee")) return false;
  callee = value["callee"];
  if (!callee.hasOwnProperty("type")) return false;
  if (callee["type"] !== "MemberExpression") return false;
  if (callee["object"]["name"] !== "DOMPurify") return false;
  if (callee["property"]["name"] !== "sanitize") return false;
  return true;
};

isDOMPurifyDeclaredVariableValid = node => {
  if (!node.hasOwnProperty("type")) return false;
  if (node["type"] !== "VariableDeclarator") return false;
  if (!node.hasOwnProperty("init")) return false;
  return isObjectExpressionDOMPurified(node["init"]);
};

removeNLastKeys = (keys, numberOfKeysToRemove) => {
  return keys.slice(0, -numberOfKeysToRemove);
};

deepestCommonKeys = (address1, address2) => {
  splittedAddress1 = address1.split(".");
  splittedAddress2 = address2.split(".");
  numberOfCommonKeys = 0;
  for (
    keyIndex = 0;
    keyIndex < Math.min(splittedAddress1.length, splittedAddress2.length);
    keyIndex++
  ) {
    if (splittedAddress1[keyIndex] === splittedAddress2[keyIndex]) {
      numberOfCommonKeys++;
    }
  }
  return numberOfCommonKeys;
};

keepDeepestCommonAddress = commonAddresses => {
  return Object.keys(commonAddresses).filter(x => {
    return (
      commonAddresses[x] == Math.max.apply(null, Object.values(commonAddresses))
    );
  });
};

isIdentifierDOMPurified = (nodeAddress, node, ast, flatAst) => {
  if (!node.hasOwnProperty("name")) return false;
  identifierName = node["name"];
  potentialIdentifierNodes = findKeyJSONValue(flatAst, identifierName);
  potentialIdentifierNodes = potentialIdentifierNodes.filter(
    address => !address.includes(nodeAddress.join("."))
  );
  potentialIdentifierNodes = potentialIdentifierNodes.filter(
    address => !address.includes("loc.identifierName")
  );
  if (potentialIdentifierNodes.length === 0) return false;
  if (potentialIdentifierNodes.length === 1) {
    objectExpressionNodeAddress = removeNLastKeys(
      potentialIdentifierNodes[0].split("."),
      2
    );
    objectExpressionNode = getObjectNestedKeys(
      ast,
      objectExpressionNodeAddress
    );
    return isDOMPurifyDeclaredVariableValid(objectExpressionNode);
  } else {
    const numberOfCommonKeys = {};
    potentialIdentifierNodes.map(node => {
      const key = node;
      const value = deepestCommonKeys(node, nodeAddress.join("."));
      Object.assign(numberOfCommonKeys, { [key]: value });
    });
    deepestCommonAddress = keepDeepestCommonAddress(numberOfCommonKeys);
    goodOneNodeAddress = removeNLastKeys(
      deepestCommonAddress.slice(-1)[0].split("."),
      2
    );
    correspondingNode = getObjectNestedKeys(ast, goodOneNodeAddress);
    return isDOMPurifyDeclaredVariableValid(correspondingNode);
  }
};

checkFileAgainstDangerouslySetInnerHTML = filePath => {
  console.log(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const ast = babelParser.parse(content, {
    sourceType: "module",
    plugins: ["jsx", "flow", "classProperties"]
  });
  const flatAST = getFlatObject(ast);
  const xssKeys = findKeyJSONValue(flatAST, "dangerouslySetInnerHTML");
  let isFileDOMPurified = true;
  xssKeys.map(xssKey => {
    let keys = splitKey(xssKey).slice(0, -2);
    keys.push("value");
    keys.push("expression");
    dangerouslySetInnerHTMLParameterNode = getObjectNestedKeys(ast, keys);
    switch (dangerouslySetInnerHTMLParameterNode["type"]) {
      case "CallExpression":
        if (!isCallExpressionDOMPurified(dangerouslySetInnerHTMLParameterNode))
          isFileDOMPurified = false;
        break;
      case "ObjectExpression":
        if (
          !isObjectExpressionDOMPurified(dangerouslySetInnerHTMLParameterNode)
        )
          isFileDOMPurified = false;
        break;
      case "Identifier":
        if (
          !isIdentifierDOMPurified(
            keys,
            dangerouslySetInnerHTMLParameterNode,
            ast,
            flatAST
          )
        )
          isFileDOMPurified = false;
        break;
    }
  });
  if (isFileDOMPurified) {
    console.log("\x1b[32m%s\x1b[0m", "DOMPurify is correctly set!");
  } else {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "WARNING, DOMPurify is not used (or not correctly)!"
    );
  }
};

atRiskFiles.map(file => checkFileAgainstDangerouslySetInnerHTML(file));
