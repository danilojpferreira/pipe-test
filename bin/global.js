#!/usr/bin/env node

var pipeTest = require('../index');

// Delete the 2 firsts arguments (node index.js)
var args = process.argv.splice(process.execArgv.length + 2);

// Retrieve the arguments
if (!args[0]){
    console.log('No pipeline file found!');
    return;
}
var pipeline = require(`${process.env.PWD}/${args[0]}`);
var options = args[1] ? require(`${process.env.PWD}/${args[1]}`) : require('../options.json');
var pwd = process.env.PWD ?? ''

// run the function
pipeTest.test(pipeline, options, pwd);

