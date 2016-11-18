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

// File systems extra package

var fs = require('fs-extra');

//var console = require('./FPE_logging.js');

// Program enviroment

var environment = require('./FPE_environment.js');

// tasks class

var Task = require('./FPE_tasks.js');

// Default tasks

var defautTaskDetails = [
    {
        taskName: 'File Copier',
        watchFolder: environment.options.watchFolder,
        processDetails: {prog: 'node', args: ['./FPE_copyFiles.js', environment.options.destinationFolder]}
    },
    {
        taskName: 'Video File Conversion',
        watchFolder: 'WatchFolderVideos',
        processDetails: {prog: 'node', args: ['./FPE_handbrake.js', './destinationConverted', '{ ".mkv" : true, ".avi" : true, ".mp4" : true}']}
    },
    {
        taskName: 'File ePrinter',
        watchFolder: 'ePrintWatch',
        processDetails: {prog: 'node', args: ['./FPE_eprint.js', '{ ".docx" : true, ".rtf" : true, ".txt" : true}']}
    }

];

// Tasks to run

var taskDetails=[];

// Read in taskDetails.json (if errors or not present use default)

try {

    taskDetails = JSON.parse(fs.readFileSync('./taskDetails.json', 'utf8'));

} catch (err) {

    if (err.code === 'ENOENT') {
        console.log('taskDetails.json not found. Using built in table.');
    } else {
        console.error(err);
    }

    taskDetails=defautTaskDetails;
    
};

// Create tasks

var tasksToPerform = [];

for (let tsk in taskDetails) {
    tasksToPerform.push(new Task(taskDetails[tsk]));
    tasksToPerform[tsk].on('error', function (err) {
        console.error(err);
    });
}

// process exit cleanup

function processCloseDown(callback) {

    console.log(environment.programName + ' Applciation Exiting.');

    try {
        for (let tsk in tasksToPerform) {
            tasksToPerform[tsk].destroy();
        }
    } catch (err) {
        callback(err);
    }

}

// Exit normally

process.on('exit', function () {

    processCloseDown(function (err) {
        if (err) {
            console.error('Error while closing everything:', err.stack || err);
        }
    });

    process.exit(0);

});

process.on('uncaughtException', function (err) {
    console.error('uncaught exception:', err.stack || err);
});

process.once('uncaughtException', function (err) {

    processCloseDown(function (err) {
        if (err) {
            console.error('Error while closing everything:', err.stack || err);
        }
    });

    process.exit(1);

});

console.log(environment.programName + ' Started.');

console.log('Default Watcher Folder = ' + environment.options.watchFolder);
console.log('Default Destination Folder = ' + environment.options.destinationFolder);

if (taskDetails !== defautTaskDetails){
     console.log('taskDetails.json file contents used.');
}

