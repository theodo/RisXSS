var glob = require("glob");

const fs = require("fs");
const readline = require("readline");
const stream = require("stream");
const babelParser = require("@babel/parser");

const PROJECT_PATH = "/Users/klausg/component-studio/";
const EXCLUDED_DIRECTORIES_NAMES = [
  "**/node_modules/**",
  "**/flow-typed/**",
  "**/build/**",
  "**/flow/**"
];
const XSS_WHISTLEBLOWER_KEYWORDS = ["dangerouslySetInnerHTML"];

function readLines({ input }) {
  const output = new stream.PassThrough({ objectMode: true });
  const rl = readline.createInterface({ input });
  rl.on("line", line => {
    output.write(line);
  });
  rl.on("close", () => {
    output.push(null);
  });
  return output;
}

function getObjects(obj, key, val) {
  var objects = [];
  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue;
    if (typeof obj[i] == "object") {
      objects = objects.concat(getObjects(obj[i], key, val));
    }
    //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
    else if ((i == key && obj[i] == val) || (i == key && val == "")) {
      //
      objects.push(obj);
    } else if (obj[i] == val && key == "") {
      //only add if the object is not already in the array
      if (objects.lastIndexOf(obj) == -1) {
        objects.push(obj);
      }
    }
  }
  return objects;
}

function getFlatObject(object) {
  function iter(o, p) {
    if (Array.isArray(o)) {
      o.forEach(function(a, i) {
        iter(a, p.concat(i));
      });
      return;
    }
    if (o !== null && typeof o === "object") {
      Object.keys(o).forEach(function(k) {
        iter(o[k], p.concat(k));
      });
      return;
    }
    path[p.join(".")] = o;
  }

  var path = {};
  iter(object, []);
  return path;
}

function findKeyJSONValue(object, value) {
  return Object.keys(object).filter(key => object[key] === value);
}

function getObjectNestedKeys(object, nestedList) {
  if (nestedList.length == 1) {
    return object[nestedList[0]];
  } else {
    return getObjectNestedKeys(object[nestedList[0]], nestedList.slice(1));
  }
}

function getObjectAndAddressNestedKeys(
  object,
  nestedList,
  initialList = nestedList
) {
  if (nestedList.length == 1) {
    return { object: object[nestedList[0]], address: initialList };
  } else {
    return getObjectAndAddressNestedKeys(
      object[nestedList[0]],
      nestedList.slice(1),
      initialList
    );
  }
}

function splitKey(key) {
  return key.split(".");
}

function isDangerouslySetInnerHtmlParameterValid(object) {
  if (!Array.isArray(object)) return false;
  if (object.length !== 1) return false;
  uniqueNode = object[0];
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
}

function biggestCommonAddress(address1, address2) {
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
  return splittedAddress1.slice(0, numberOfCommonKeys - 1);
}

function isDOMPurifyVariableValid(node) {
  if (!node.hasOwnProperty("type")) return false;
  if (node["type"] !== "VariableDeclarator") return false;
  if (!node.hasOwnProperty("init")) return false;
  if (!node["init"].hasOwnProperty("properties")) return false;
  return isDangerouslySetInnerHtmlParameterValid(node["init"]["properties"]);
}

console.log("======== NEW RUN ========");

glob(`${PROJECT_PATH}**/*.js`, { ignore: EXCLUDED_DIRECTORIES_NAMES }, function(
  er,
  files
) {
  files.map(file => {
    const input = fs.createReadStream(file);
    (async () => {
      for await (const line of readLines({ input })) {
        XSS_WHISTLEBLOWER_KEYWORDS.some(xssKeywords => {
          if (line.includes(xssKeywords)) {
            console.log(
              "----------------------------------------------------------"
            );
            console.log(file);
            const content = fs.readFileSync(file, "utf8");
            const ast = babelParser.parse(content, {
              sourceType: "module",
              plugins: ["jsx", "flow", "classProperties"]
            });
            flatAST = getFlatObject(ast);
            let xssKEY = findKeyJSONValue(flatAST, xssKeywords)[0];
            let keys = splitKey(xssKEY).slice(0, -2);
            keys.push("value");
            keys.push("expression");
            switch (getObjectNestedKeys(ast, keys)["type"]) {
              case "CallExpression":
                console.log("CallExpression");
                keys.push("callee");
                getObjectNestedKeys(ast, keys)["property"] &&
                  keys.push("property");
                getObjectNestedKeys(ast, keys)["name"] && keys.push("name");
                if (getObjectNestedKeys(ast, keys) !== "sanitize") {
                  console.log(
                    "\x1b[31m%s\x1b[0m",
                    "WARNING, DOMPurify is not used (or not correctly)!"
                  );
                } else {
                  console.log(
                    "\x1b[32m%s\x1b[0m",
                    "DOMPurify is correctly set!"
                  );
                }
                break;
              case "Identifier":
                identifierNode = getObjectNestedKeys(ast, keys);
                if (!getObjectNestedKeys(ast, keys).hasOwnProperty("name"))
                  return;
                identifierName = getObjectNestedKeys(ast, keys)["name"];
                potentialIdentifierAddresses = findKeyJSONValue(
                  flatAST,
                  identifierName
                );
                potentialIdentifierAddresses = potentialIdentifierAddresses.filter(
                  address => !address.includes(keys.join("."))
                );
                if (
                  isDOMPurifyVariableValid(
                    getObjectNestedKeys(
                      ast,
                      biggestCommonAddress(
                        potentialIdentifierAddresses[0],
                        potentialIdentifierAddresses[1]
                      )
                    )
                  )
                ) {
                  console.log(
                    "\x1b[32m%s\x1b[0m",
                    "DOMPurify is correctly set!"
                  );
                } else {
                  console.log(
                    "\x1b[31m%s\x1b[0m",
                    "WARNING, DOMPurify is not used (or not correctly)!"
                  );
                }
                break;
              case "ObjectExpression":
                if (
                  isDangerouslySetInnerHtmlParameterValid(
                    getObjectNestedKeys(ast, keys)["properties"]
                  )
                ) {
                  console.log(
                    "\x1b[32m%s\x1b[0m",
                    "DOMPurify is correctly set!"
                  );
                } else {
                  console.log(
                    "\x1b[31m%s\x1b[0m",
                    "WARNING, DOMPurify is not used (or not correctly)!"
                  );
                }
                break;
              default:
                console.log("Aucun cas ne convient");
            }
          }
        });
      }
    })();
  });
});
