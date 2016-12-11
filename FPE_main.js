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

//
// Logging
//

const console = require('./FPE_logging.js');

//
// Path handling
// 

const path = require('path');

//  
// File systems extra package
//

const fs = require('fs-extra');

// Task class

const Task = require('./FPE_task.js');

//  Command line parameter processing (add to globals saves including all over th place).

global.commandLine = require('./FPE_commandLineOptions.js');

// Default (built-in) tasks

var defautTaskDetails = [];

// Tasks available to run and tasks running

var tasksToRunDetails = [];
var tasksRunning = [];

//
// ======================
// PROCESS EVENT HANDLERS
// ======================
// 

function processEventHandlers() {

    //
    // process exit cleanup
    //

    function processCloseDown(callback) {

        console.log(global.commandLine.options.name + ' Exiting.');

        try {
            for (let tsk in tasksRunning) {
                tasksRunning[tsk].destroy();
            }
        } catch (err) {
            callback(err);
        }

    }

    //
    // Exit normally
    //

    process.on('exit', function () {

        processCloseDown(function (err) {
            if (err) {
                console.error('Error while closing everything:', err.stack || err);
            }
        });

        process.exit(0);

    });

    //
    // On mutliple uncaught exceptions report
    //

    process.on('uncaughtException', function (err) {
        console.error('uncaught exception:', err.stack || err);
    });

    //
    // On first uncaught exception close down and exit
    //

    process.once('uncaughtException', function (err) {

        processCloseDown(function (err) {
            if (err) {
                console.error('Error while closing everything:', err.stack || err);
            }
        });

        process.exit(1);

    });

}

//
// ===============
// LOCAL FUNCTIONS
// ===============
// 

//
// Process any passed in command line arguments
//

function processOptions(commandLine) {

    // Display help menu and exit.
    // It uses a fiddly peice of code to align text (tidyup later).

    if (commandLine.options.help) {
        console.log(commandLine.options.name + '\n');
        console.log('Command                        Desciption\n');
        for (let option in commandLine.definitions) {
            let len = commandLine.definitions[option].name.length + 1;
            if (commandLine.definitions[option].type) {
                console.log('--%s(-%s) arg%s %s ', commandLine.definitions[option].name,
                        commandLine.definitions[option].alias,
                        ' '.repeat(20 - len), commandLine.definitions[option].Description);
            } else {
                console.log('--%s(-%s) %s %s', commandLine.definitions[option].name,
                        commandLine.definitions[option].alias,
                        ' '.repeat(23 - len), commandLine.definitions[option].Description);
            }
        }
        process.exit(0);
    }
    
    // Display list of built-in tasks and exit

    if (commandLine.options.list) {
        console.log(commandLine.options.name + '\n');
        console.log("Built in Tasks\n");
        for (let tsk in defautTaskDetails) {
            console.log("No %d ------------> %s", tsk, defautTaskDetails[tsk].taskName);

        }
        console.log("\n");
        process.exit(0);
    }
    
    // Create task details JSON from defautTaskDetails

    if (commandLine.options.dump) {
        console.log(commandLine.options.name + '\n');
        console.log("Dumping tasks details to " + commandLine.options.dump);
        try {
            fs.writeFileSync(commandLine.options.dump, JSON.stringify(defautTaskDetails));
            process.exit(0);
        } catch (err) {
            console.log("Error creating dump file" + err);
            process.exit(1);
        }
    }

    // If --run passed and valid then flag built-in to run and disable taskfile

    if (commandLine.options.run !== -1) {
        if (defautTaskDetails[commandLine.options.run]) {
            defautTaskDetails[commandLine.options.run].runTask = true;
            commandLine.options.taskfile = undefined;
        } else {
            console.log('Error: Invalid Built-in Task = [ %d ]. Defaulting to JSON file.', commandLine.options.run);
        }
    }
}

//
// Read task process scripts and create defautTaskDetails from there signatures.
//

function createDefautTaskDetails(commandLine) {

    let files;

    try {

        files = fs.readdirSync(commandLine.options.root);

        files.forEach(function (files, index) {

            if (path.extname(files) === '.js') {
                var signature = require(commandLine.options.root + files).signature;
                if (signature) {
                    defautTaskDetails.push(signature());
                }
            }

        });

    } catch (err) {
        console.error(err);
        process.exit(1);  // Closedown
    }
    
}

//
// =========
// MAIN CODE
// =========
//

// Parse tasks directory and see what is there

createDefautTaskDetails(global.commandLine);

// Process any options & setup event handlers

processOptions(global.commandLine);

processEventHandlers();

// Siganal FPE up and running

console.log(global.commandLine.options.name + ' Started.');
console.log('Default Watcher Folder = [%s]', global.commandLine.options.watch);
console.log('Default Destination Folder = [%s]', global.commandLine.options.dest);

// Read in global.commandLine.options.taskfile JSON file (if errors or not present use built-in)

try {

    if (global.commandLine.options.taskfile) {
        tasksToRunDetails = JSON.parse(fs.readFileSync(global.commandLine.options.taskfile, 'utf8'));
    } else {
        tasksToRunDetails = defautTaskDetails;
    }


} catch (err) {

    if (err.code === 'ENOENT') {
        console.log('tasksToRunDetails.json not found. Using built in table.');
    } else {
        console.error(err);
    }

    tasksToRunDetails = defautTaskDetails;

}

// Create task if flagged to run. Add to array of running and setup error event handler

for (let tsk in tasksToRunDetails) {

    if (tasksToRunDetails[tsk].runTask) {
        tasksToRunDetails[tsk].processDetails.args[0] = global.commandLine.options.root + tasksToRunDetails[tsk].processDetails.args[0];
        tasksRunning.push(new Task(tasksToRunDetails[tsk]));
        tasksRunning[tasksRunning.length - 1].start();
        tasksRunning[tasksRunning.length - 1].on('error', function (err) {
            console.error(err);
        });
    }
}

// Signal using JSON file

if (tasksToRunDetails !== defautTaskDetails) {
    console.log('tasksToRunDetails.json file contents used.');
}

if (tasksRunning.length === 0) {
    console.log('*** No Tasks Specified To Run ***');
}

