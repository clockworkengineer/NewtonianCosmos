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

// Task Process Utils

const TPU = require(global.commandLine.options.root + 'FPE_taskProcessUtil.js');

//
// ===============
// LOCAL FUNCTIONS
// ===============
// 

//
// Read task process scripts and create defautTaskDetails from there signatures.
//

function createDefautTaskDetails(defautTaskDetails, commandLine) {

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
// If obj has no properties return true else false
//

function isEmpty(obj) {

    for (let prop in obj) {
        return (false);
    }
    return (true);
}

//
// Create task if flagged to run. Add to array of running and setup error and close event handlers 
//

function runSelectedTasks(tasksToRunDetails, tasksRunning) {


    for (let tsk in tasksToRunDetails) {

        if (tasksToRunDetails[tsk].runTask) {

            tasksToRunDetails[tsk].processDetails.args[0] = global.commandLine.options.root + tasksToRunDetails[tsk].processDetails.args[0];
            tasksRunning[tasksToRunDetails[tsk].taskName] = (new Task(tasksToRunDetails[tsk]));

            tasksRunning[tasksToRunDetails[tsk].taskName].start();

            tasksRunning[tasksToRunDetails[tsk].taskName].on('error', function (err) {
                console.error(err);
            });

            // For close make sure resources freed, remove from running list and if no tasks left exit.

            tasksRunning[tasksToRunDetails[tsk].taskName].on('close', function (taskName) {
                console.log("TASK [" + taskName + "] Closed.");
                tasksRunning[taskName].destroy();
                delete tasksRunning[taskName];
                if (isEmpty(tasksRunning)) {
                    process.exit(0);
                }
            });
        }
    }

}

//
// =========
// MAIN CODE
// =========
//

(function MAIN() {

    //
    // FPE closedown code
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

    // Default (built-in) tasks

    let defautTaskDetails = [];

    // Tasks available to run and tasks running

    let tasksToRunDetails = [];
    let tasksRunning = [];

    // Parse tasks directory and see what is there

    createDefautTaskDetails(defautTaskDetails, global.commandLine);

    // Process any options & setup exit event handlers

    global.commandLine.processOptions(defautTaskDetails);

    TPU.processExitHandlers(processCloseDown);

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

    // Start tasks running

    runSelectedTasks(tasksToRunDetails, tasksRunning);

    // Signal using JSON file

    if (tasksToRunDetails !== defautTaskDetails) {
        console.log('tasksToRunDetails.json file contents used.');
    }

    // No tasks selected

    if (isEmpty(tasksRunning)) {
        console.log('*** No Tasks Specified To Run ***');
    }

})();

