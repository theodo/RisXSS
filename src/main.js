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

/*
 Create a list of file matching the given regex, ignoring excludedDirectories
*/
createListOfFilesToCheck = (projetPath, excludedDirectories) => {
  return glob.sync(`${projetPath}**/*.js`, { ignore: excludedDirectories });
};

/*
 For a given file, check if XSS_WHISTLEBLOWER_KEYWORDS are used in them.
 Return true if the file contains one of them.
*/
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

/*
 Rapid function to verify whether a file is a react file or not.
*/
isReactFile = filePath => {
  var content = fs.readFileSync(filePath).toString();
  return content.includes("from 'react'");
};

/* 
 For a json nested object gives its flat representation 

 Example : 
 ```
 Node {
  type: 'File',
  start: 0,
  end: 260,
  loc:
   SourceLocation {
     start: Position { line: 1, column: 0 },
     end: Position { line: 16, column: 0 } },
  program:
   Node {
     type: 'Program',
     start: 0,
     end: 260,
     loc: SourceLocation { start: [Position], end: [Position] },
     sourceType: 'module',
     interpreter: null,
     body: [ [Node], [Node], [Node] ],
     directives: [] },
  comments:
   [ { type: 'CommentLine',
       value: ' @flow',
       start: 0,
       end: 8,
       loc: [SourceLocation] } ] }
  ```

  will be transformed into : 

  { type: 'File',
  start: 0,
  end: 1118,
  'loc.start.line': 1,
  'loc.start.column': 0,
  'loc.end.line': 48,
  'loc.end.column': 0,
  'program.type': 'Program',
  'program.start': 0,
  'program.end': 1118,
  'program.loc.start.line': 1,
  'program.loc.start.column': 0,
  'program.loc.end.line': 48,
  'program.loc.end.column': 0,
  'program.sourceType': 'module',
  'program.interpreter': null,
  'program.body.0.type': 'ImportDeclaration',
  'program.body.0.start': 0,
  'program.body.0.end': 26,
  'program.body.0.loc.start.line': 1,
  ...
   }
*/

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

/* 
  Find location for a given value in the flat object 
  
  Example of results : 'program.body.3.declarations.0.init.body.body.1.argument.children.1.openingElement.attributes.0.name.name'

*/
findKeyJSONValue = (object, value) => {
  return Object.keys(object).filter(key => object[key] === value);
};

/*
 Split dot separated string into a list
*/
splitKey = key => {
  return key.split(".");
};

/*
 Given a nestedList of keys such as ['program', 'body', '3'], return the value of object['program']['body']['3']
*/
getObjectNestedKeys = (object, nestedList) => {
  if (nestedList.length == 1) {
    return object[nestedList[0]];
  } else {
    return getObjectNestedKeys(object[nestedList[0]], nestedList.slice(1));
  }
};

/*
 When we write dangerouslySetInnerHTML{somefunction()}
 The ast will create a node of type CallExpression
 This function check that the function pass to dangerouslySetInnerHTML is DOMPurify.sanitize
*/
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

/*
  When we write something like this : 
  dangerouslySetInnerHTML={{ exampleObject: ...}}
  We will have a node of type ObjectExpression in the ast because the
   parameter pass to dangerouslySetInnerHTML is an object.
  This function verify that the object as the following shape : 
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(something) }}
*/
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
/*
 This function verify that the variable pass to dangerouslySetInnerHTML
  points to a valid object.
*/
isDOMPurifyDeclaredVariableValid = node => {
  if (!node.hasOwnProperty("type")) return false;
  if (node["type"] !== "VariableDeclarator") return false;
  if (!node.hasOwnProperty("init")) return false;
  return isObjectExpressionDOMPurified(node["init"]);
};

/*
 Remove N last object in an array 
*/
removeNLastKeys = (keys, numberOfKeysToRemove) => {
  return keys.slice(0, -numberOfKeysToRemove);
};

/*
 Find the number of identical keys between 2 addresses 
 Example :
  program.body.12.body.body.3.value.body.body.2.consequent.body.1.declarations.0.id.name
  program.body.12.body.body.3.value.body.body.2.consequent.body.2.argument.openingElement.attributes.0.value.expression
  
  share : program.body.12.body.body.3.value.body.body.2.consequent.body
  Then, the result for this example will be : 12
*/
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

/*
 For a given key value object, keep only key associated to the maximum value
 Example : 
  { 'a': 12, 'b': 3, 'c': 12} 
   will return ['a', 'c']
*/
keepDeepestCommonAddress = commonAddresses => {
  return Object.keys(commonAddresses).filter(x => {
    return (
      commonAddresses[x] == Math.max.apply(null, Object.values(commonAddresses))
    );
  });
};

/*
 When the node of an ast has the type Identifier, check
  if this node uses DOMPurify.

 The complexity of this method comes from the fact that when we have for instance `const html`, 
  the identifier html can be present multiple times in the file, then we have to find the good assignation
  of the identifier.

 This implementation takes the closest node (compared to the position of the parameter of dangerouslySetInnerHTML) 
  corresponding to the identifier :
 For example, if we have : 
  let html = '';
  html = '<p> something else </p>';   <- this assignation will be choosen
  dangerouslySetInnerHTML{html}
 
  Known issue of this implementation not yet corrected:
  If we have this : 
    let html = '';
    html = '<p> something else </p>';   
    dangerouslySetInnerHTML{html}
    html = '<p>Bad choice</p>'  <- this assignation will be choosen
  Because it's the last assignation to html in the same block of code.
*/
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

/* Check whether a file is DOMPurified */
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

/* Check recursively that all file in path are protected against XSS using DOMPurify */
checkPath = path => {
  if (path !== ".") console.log(`The path : ${path} will be analyzed \n`);
  var filesToCheck = createListOfFilesToCheck(path, EXCLUDED_DIRECTORIES_NAMES);
  console.log(`${filesToCheck.length} files to analyze...`);
  atRiskFiles = filesToCheck.filter(
    path => isReactFile(path) && isFileContainsXSSKeywords(path)
  );
  console.log(`Found ${atRiskFiles.length} files at risk \n`);
  if (atRiskFiles.length === 0) console.log("No file at risk!");
  atRiskFiles.map(file => checkFileAgainstDangerouslySetInnerHTML(file));
};

module.exports.checkPath = checkPath;
