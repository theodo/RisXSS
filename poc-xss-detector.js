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
  return Object.keys(object).find(key => object[key] === value);
}

function getObjectNestedKeys(object, nestedList) {
  if (nestedList.length == 1) {
    return object[nestedList[0]];
  } else {
    return getObjectNestedKeys(object[nestedList[0]], nestedList.slice(1));
  }
}

function splitKey(key) {
  return key.split(".");
}

console.log("======== NEW RUN ========");
console.log("======== NEW RUN ========");
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
            console.log("----------------------------------------------------------");
            console.log(file);
            const content = fs.readFileSync(file, "utf8");
            const ast = babelParser.parse(content, {
              sourceType: "module",
              plugins: ["jsx", "flow", "classProperties"]
            });
            flatAST = getFlatObject(ast);
            let xssKEY = findKeyJSONValue(flatAST, "dangerouslySetInnerHTML");
            console.log(xssKEY);
            let keys = splitKey(xssKEY).slice(0, -2);
            keys.push("value");
            keys.push("expression");
            if (getObjectNestedKeys(ast, keys)['type'] !== 'CallExpression') {
              console.log('/!\\ Not XSS proof !')
            } else {
              keys.push("callee");
              getObjectNestedKeys(ast, keys)['property'] && keys.push("property");
              getObjectNestedKeys(ast, keys)['name'] && keys.push("name");
              if (getObjectNestedKeys(ast, keys) !== 'sanitize') {
                console.log('/!\\ Not XSS proof !')
              } else {
                console.log('DOMPurify seems to be used, GREAT !')
              }
            }
          }
        });
      }
    })();
  });
});
