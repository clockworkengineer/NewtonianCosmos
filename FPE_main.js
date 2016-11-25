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

var options = require('./FPE_commandLineOptions.js');

// Default tasks

var defautTaskDetails = [
    {
        taskName: 'File Copier',
        watchFolder: options.watch,
        processDetails: {prog: 'node', args: ['./FPE_copyFiles.js', options.destination]},
        chokidarOptions: { ignored: /[\/\\]\./, ignoreInitial: true, persistent: true}, // OPTIONAL
        deleteSource : true,  // OPTIONAL
        runTask: true         // true =  run task (for FPE_MAIN IGNORED BY TASK)
    },
    {
        taskName: 'Video File Conversion',
        watchFolder: 'WatchFolderVideos',
        processDetails: {prog: 'node', args: ['./FPE_handbrake.js', './destinationConverted', '{ ".mkv" : true, ".avi" : true, ".mp4" : true}']},
        runTask: false // true =  run task
     },
    {
        taskName: 'File ePrinter',
        watchFolder: 'ePrintWatch',
        processDetails: {prog: 'node', args: ['./FPE_eprint.js', '{ ".docx" : true, ".rtf" : true, ".txt" : true}']},
        runTask: false // true =  run task
   },
    {
        taskName: 'File Copier On Extension',
        watchFolder: options.watch,
        processDetails: {prog: 'node', args: ['./FPE_copyFilesOnExt.js', options.destination,'{ ".docx" : "documents" }']},
        runTask: false // true =  run task
    }
  
];

// Tasks available to run and tasks running

var tasksToRunDetails=[];
var tasksRunning = [];

//
// ======================
// PROCESS EVENT HANDLERS
// ======================
// 

//
// process exit cleanup
//

function processCloseDown(callback) {

    console.log(options.name+' Exiting.');

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

//
// =========
// MAIN CODE
// =========
//

console.log(options.name + ' Started.');

console.log('Default Watcher Folder = [ %s ]', options.watch);
console.log('Default Destination Folder = [ %s ]', options.destination);

// Read in options.taskfile JSON file (if errors or not present use default)

try {

    tasksToRunDetails = JSON.parse(fs.readFileSync(options.taskfile, 'utf8'));

} catch (err) {

    if (err.code === 'ENOENT') {
        console.log('tasksToRunDetails.json not found. Using built in table.');
    } else {
        console.error(err);
    }

    tasksToRunDetails=defautTaskDetails;
    
};

 // Create task if flagged to run. Add to array of running and setup error event handler

for (let tsk in tasksToRunDetails) {
    
    if (tasksToRunDetails[tsk].runTask) {
        
        tasksRunning.push(new Task(tasksToRunDetails[tsk]));
        tasksRunning[tasksRunning.length-1].on('error', function (err) {
            console.error(err);
        });
        
    }
}

// Signal using JSON file

if (tasksToRunDetails !== defautTaskDetails){
     console.log('tasksToRunDetails.json file contents used.');
}

