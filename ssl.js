

const {execFile,exec,execSync} = require('child_process');


console.log(execSync('node helloworld.js').toString())