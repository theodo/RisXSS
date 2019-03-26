#!/usr/bin/env node

var program = require("commander");
var functions = require("./main");

program
  .option(
    "-p, --path [scanDirectory]",
    "The path of the directory you want to analyse"
  )
  .parse(process.argv);

var scanDirectory = program.path;

if (!scanDirectory) {
  console.warn(
    "No path was specified using the -p options. RisXSS will scan the current directory"
  );
  scanDirectory = "./";
}

functions.checkPath(scanDirectory);
