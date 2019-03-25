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
console.log(atRiskFiles);

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

checkFileAgainstDangerouslySetInnerHTML = filePath => {
  const content = fs.readFileSync(filePath, "utf8");
  const ast = babelParser.parse(content, {
    sourceType: "module",
    plugins: ["jsx", "flow", "classProperties"]
  });
  const flatAST = getFlatObject(ast);
  const xssKeys = findKeyJSONValue(flatAST, "dangerouslySetInnerHTML");
  console.log(xssKeys);
  xssKeys.map(xssKey => {
    let keys = splitKey(xssKey).slice(0, -2);
    keys.push("value");
    keys.push("expression");
    switch (getObjectNestedKeys(ast, keys)["type"]) {
      case "CallExpression":
        console.log("CallExpression");
        break;
      case "Identifier":
        console.log("Identifier");
        break;
      case "ObjectExpression":
        console.log("ObjectExpression");
        break;
    }
  });
};

atRiskFiles.map(file => checkFileAgainstDangerouslySetInnerHTML(file));
