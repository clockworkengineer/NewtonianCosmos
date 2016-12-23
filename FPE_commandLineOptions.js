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

function JSONValue(str) {

    try {
        return(JSON.parse(str));
    } catch (err) {
        console.log("Error in JSON: [%s]. Using Default.", str);
    }
 
    return({ignored: /[\/\\]\./, ignoreInitial: true, persistent: true});
    
}

// File systems extra package

const fs = require('fs-extra');

//  Command line parameter processing

const commandLineArgs = require('command-line-args');

const definitions = [
    {name: 'taskfile', alias: 't', type: String, defaultValue: './tasks/tasksToRunDetails.json', Description: 'Task file JSON file to run with.'},
    {name: 'watch', alias: 'w', type: String, defaultValue: 'watch', Description: 'Watch folder.'},
    {name: 'dest', alias: 'd', type: String, defaultValue: 'destination', Description: 'Desination folder.'},
    {name: 'name', alias: 'n', type: String, defaultValue: 'File Processing Engine', Description: 'Program desciption.'},
    {name: 'dump', alias: 'u', type: String, Description: 'Dump built-in tasks to JSON file'},
    {name: 'delete', alias: 'e',  type: Boolean, defaultValue: false, Description: 'Delete source file.'},
    {name: 'run', alias: 'r', type: Number, defaultValue: -1, Description: 'Run task number.'},
    {name: 'chokidar', alias: 'c', type: JSONValue, defaultValue: {"ignored": "/[/\\]./", "ignoreInitial": true, "persistent": true}, Description: 'Chokidar options.'},
    {name: 'list', alias: 'i', Description: 'List tasks built-in.'},
    {name: 'root', alias:'o', String, defaultValue: './tasks/', Description: 'Folder containing tasks.'},
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

//
// Process any passed in command line arguments
//

function processOptions(defautTaskDetails) {

    // Display help menu and exit.
    // It uses a fiddly peice of code to align text (tidyup later).

    if (options.help) {
        console.log(options.name + '\n');
        console.log('Command                        Desciption\n');
        for (let option in definitions) {
            let len = definitions[option].name.length + 1;
            if (definitions[option].type) {
                console.log('--%s(-%s) arg%s %s ', definitions[option].name,
                        definitions[option].alias,
                        ' '.repeat(20 - len), definitions[option].Description);
            } else {
                console.log('--%s(-%s) %s %s', definitions[option].name,
                        definitions[option].alias,
                        ' '.repeat(23 - len), definitions[option].Description);
            }
        }
        process.exit(0);
    }
    
    // Display list of built-in tasks and exit

    if (options.list) {
        console.log(options.name + '\n');
        console.log('Built in Tasks\n');
        for (let tsk in defautTaskDetails) {
            console.log('No %d ------------> %s', tsk, defautTaskDetails[tsk].taskName);

        }
        console.log('\n');
        process.exit(0);
    }
    
    // Create task details JSON from defautTaskDetails

    if (options.dump) {
        console.log(options.name + '\n');
        console.log('Dumping tasks details to ' + options.dump);
        try {
            fs.writeFileSync(options.dump, JSON.stringify(defautTaskDetails));
            process.exit(0);
        } catch (err) {
            console.log('Error creating dump file' + err);
            process.exit(1);
        }
    }

    // If --run passed and valid then flag built-in to run and disable taskfile

    if (options.run !== -1) {
        if (defautTaskDetails[options.run]) {
            defautTaskDetails[options.run].runTask = true;
            options.taskfile = undefined;
        } else {
            console.log('Error: Invalid Built-in Task = [ %d ]. Defaulting to JSON file.', options.run);
        }
    }
}

module.exports = { options, processOptions };




