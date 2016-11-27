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

var console = require('./FPE_logging.js');

//  
// File systems extra package
//

var fs = require('fs-extra');

// Task class

var Task = require('./FPE_tasks.js');

//  Command line parameter processing

var commandLine = require('./FPE_commandLineOptions.js');

// Default (built-in) tasks

var defautTaskDetails = [
    {
        taskName: 'File Copier',
        watchFolder: commandLine.options.watch,
        processDetails: {prog: 'node', args: ['./FPE_copyFiles.js', commandLine.options.dest]},
        chokidarOptions: commandLine.options.chokidar, // OPTIONAL
        deleteSource: commandLine.options.delete,      // OPTIONAL
        runTask: false                                 // true =  run task (for FPE_MAIN IGNORED BY TASK)
    },
    {
        taskName: 'Video File Conversion',
        watchFolder: commandLine.options.watch,
        processDetails: {prog: 'node', args: ['./FPE_handbrake.js', commandLine.options.dest, '{ ".mkv" : true, ".avi" : true, ".mp4" : true}']},
        chokidarOptions: commandLine.options.chokidar, // OPTIONAL
        deleteSource: commandLine.options.delete,      // OPTIONAL
        runTask: false                                 // true =  run task (for FPE_MAIN IGNORED BY TASK)
    },
    {
        taskName: 'File ePrinter',
        watchFolder: commandLine.options.watch,
        processDetails: {prog: 'node', args: ['./FPE_eprint.js', '{ ".docx" : true, ".rtf" : true, ".txt" : true}']},
        chokidarOptions: commandLine.options.chokidar, // OPTIONAL
        deleteSource: commandLine.options.delete,      // OPTIONAL
        runTask: false                                 // true =  run task (for FPE_MAIN IGNORED BY TASK)
    },
    {
        taskName: 'File Copier On Extension',
        watchFolder: commandLine.options.watch,
        processDetails: {prog: 'node', args: ['./FPE_copyFilesOnExt.js', commandLine.options.dest, '{ ".docx" : "documents" }']},
        chokidarOptions: commandLine.options.chokidar, // OPTIONAL
        deleteSource: commandLine.options.delete,      // OPTIONAL
        runTask: false                                 // true =  run task (for FPE_MAIN IGNORED BY TASK)
    }

];

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

        console.log(commandLine.options.name + ' Exiting.\n');

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
// =========
// MAIN CODE
// =========
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

// Process any options & setup event handlers

processOptions(commandLine);
processEventHandlers();

// Siganl FPE up and running

console.log(commandLine.options.name + ' Started.');
console.log('Default Watcher Folder = [%s]', commandLine.options.watch);
console.log('Default Destination Folder = [%s]', commandLine.options.dest);

// Read in commandLine.options.taskfile JSON file (if errors or not present use built-in table)

try {

    if (commandLine.options.taskfile) {
        tasksToRunDetails = JSON.parse(fs.readFileSync(commandLine.options.taskfile, 'utf8'));
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

        tasksRunning.push(new Task(tasksToRunDetails[tsk]));
        tasksRunning[tasksRunning.length - 1].on('error', function (err) {
            console.error(err);
        });

    }
}

// Signal using JSON file

if (tasksToRunDetails !== defautTaskDetails) {
    console.log('tasksToRunDetails.json file contents used.');
}

