'use strict';
/* 
 * The MIT License
 *
 * Copyright 2016 Robert Tizzard.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

//  Command line parameter processing

const commandLineArgs = require('command-line-args');

const definitions = [
    {name: 'taskfile', alias: 't', type: String, defaultValue: 'tasksToRunDetails.json', Description: 'Task file JSON file to run with.'},
    {name: 'watch', alias: 'w', type: String, defaultValue: 'watch', Description: 'Watch folder.'},
    {name: 'dest', alias: 'd', type: String, defaultValue: 'desination', Description: 'Desination folder.'},
    {name: 'name', alias: 'n', type: String, defaultValue: 'File Processing Engine', Description: 'Program desciption.'},
    {name: 'delete', alias: 'e', Description: 'Delete source file.'},
    {name: 'run', alias: 'r', type: Number, defaultValue: -1, Description: 'Run task number.'},
    {name: 'list', alias: 'i', Description: 'List tasks built-in.'},
    {name: 'logfile', alias: 'l', type: String, Description: 'Log file name.'},
    {name: 'help', alias: 'h', Description: 'Help menu.'}
];

var options;

try {

    // From defintions create options object
    
    options = commandLineArgs(definitions);

} catch (e) {
    console.log(e.message);
    process.exit(1);

}

module.exports = { options, definitions };




