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

const optionDefinitions = [
    {name: 'taskfile', alias: 't', type: String, defaultValue: 'tasksToRunDetails.json', Description: "Task File JSON file to run with."},
    {name: 'watch', alias: 'w', type: String, defaultValue: 'watch', Description: "Default watch folder."},
    {name: 'destination', alias: 'd', type: String, defaultValue: 'desination',  Description: "Default desination folder."},
    {name: 'name', alias: 'n', type: String, defaultValue: 'File Processing Engine', Description: "Program desciption."},
    {name: 'logfile', alias: 'l', type: String,  Description: "Log file name."},
    {name: 'help', alias: 'h',  Description: "Help menu."}
];

var options;

try {

   options = commandLineArgs(optionDefinitions);

    // Display help menu and exit.
    
    if (options.help) {
        console.log(options.name+"\n");
        console.log("Command                      Desciption\n");
        for (let option in optionDefinitions) {
            let len = optionDefinitions[option].name.length+optionDefinitions[option].alias.length;
            if (optionDefinitions[option].type) {
                console.log("--%s,-%s arg%s %s ", optionDefinitions[option].name, optionDefinitions[option].alias," ".repeat(20-len), optionDefinitions[option].Description);
            } else {
                console.log("--%s,-%s %s %s", optionDefinitions[option].name, optionDefinitions[option].alias, " ".repeat(23-len), optionDefinitions[option].Description);

            }
        }
        process.exit(1);
    }

} catch (e) {
    console.log(e.message);
    process.exit(1);

}

module.exports = options;



