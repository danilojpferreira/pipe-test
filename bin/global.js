#!/usr/bin/env node

var pipeTest = require('../index');

// Delete the 2 firsts arguments (node index.js)
var args = process.argv.splice(process.execArgv.length + 2);

// Retrieve the arguments
if (!args[0]){
    console.log('No pipeline argument found!');
    return;
}
var pipeline = args[0];
var options = args[1] ?? './options.json';
var pwd = process.env.PWD ?? '.'

// run the function
pipeTest.test(pipeline, options, pwd);

