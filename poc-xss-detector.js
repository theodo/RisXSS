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

let XSS_UNSECURE_FILES = [];

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

glob(`${PROJECT_PATH}**/*.js`, { ignore: EXCLUDED_DIRECTORIES_NAMES }, function(
  er,
  files
) {
  files.map(file => {
    const input = fs.createReadStream(file);
    (async () => {
      for await (const line of readLines({ input })) {
        XSS_WHISTLEBLOWER_KEYWORDS.some(substring => {
          if (line.includes(substring)) {
            console.log(file);
            const content = fs.readFileSync(file, "utf8");
            const ast = babelParser.parse(content, {
              sourceType: "module",
              plugins: ["jsx", "flow", "classProperties"]
            });
            console.log(JSON.stringify(ast));
            console.log("\n\n\n");
          }
        });
      }
    })();
  });
});
