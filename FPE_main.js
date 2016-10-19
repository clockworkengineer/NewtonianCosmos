/* 
 * The MIT License
 *
 * Copyright 2016 Robert Tizzard.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// Node specific imports

var path = require("path");
var fs = require('fs-extra');

// File watch modules

var chokidar = require("chokidar");

// Program enviroment

var environment = require("./FPE_environment.js");

environment.createFolders();

// Child processes

var child_process = require('child_process');

// Process all files passed in. On completion of child process chain the next file
// until the processing list is empty.

var filesToProcess = [];

function processFiles(filesToProcessNow) {

    if (filesToProcessNow.length) {

        proc = filesToProcessNow.shift();

        var child = child_process.execFile(proc.prog, proc.args, function (error, stdout, stderr) {

            if (error) {
                console.error(stderr);
            } else {
                console.log(stdout);
            }

             processFiles(filesToProcessNow);
             
        });
    }
   

}

// Poll for files to process and start processing.

function flushFilesToProcess () {
    
    var filesToProcessNow = filesToProcess;
    
    filesToProcess = [];
    
    processFiles(filesToProcessNow);
    
    setTimeout(flushFilesToProcess, environment.processFilesDelay * 1000);

}

// Add file to process list.

function processFile(fileName) {

    var destFile = environment.options.destinationFolder + fileName.substr(environment.options.watchFolder.length);

    filesToProcess.push({prog: 'node', args: ["./FPE_copyFiles.js", fileName, destFile]});


}

// Makes sure that the file added to the directory, but may not have been completely 
// copied yet by the Operating System, finishes being copied before it attempts to do 
// anything with the file. This used to use stat to see whether the file modified time
// has stopped changing but that seems to be unreliable when copying in multiple large
// files so what I decided to do was actually get the file lock with an open for append. 
// If the file is still being copied it returns file busy and we try again later. As
// soon as we can get the lock (file has finished copying) close it and start proessing.
// When we open append the file will not be truncated and we no that it exists because we
// got the watcher event.

function checkFileCopyComplete(fileName) {

    fs.open(fileName, 'a', function (err, fd) {

        if (err) {
            if (err.code === 'EBUSY') {
              //  console.log("File " + fileName + " busy.Waiting for it to free up.");
                setTimeout(checkFileCopyComplete, environment.options.fileCopyDelaySeconds * 1000, fileName);
            } else {
                console.error(err);
            }
        } else {
            fs.close(fd);
            processFile(fileName);
        }

    });

}

//  Setup up folder watcher.

var watcher = chokidar.watch(environment.options.watchFolder, {
    ignored: /[\/\\]\./,
    persistent: true
});

// File added, so add to process list.

watcher
        .on('ready', function () {
            console.log('Initial scan complete. Ready for changes.\n');
        })
        .on('unlink', function (fileName) {
            console.log('File: ' + fileName + ', has been REMOVED');
        })
        .on('error', function (err) {
            console.error('Chokidar file watcher failed. ERR: ' + err.message);
        })
        .on("add", function (fileName) {
            console.log('File copy started...');
            setTimeout(checkFileCopyComplete, environment.options.fileCopyDelaySeconds * 1000, fileName);
        });

// Clean up processing.

process.on("exit", function () {
    console.log(environment.programName + " Applciation Exiting.");
});

console.log(environment.programName + " Started\n");

setTimeout(flushFilesToProcess, environment.processFilesDelay * 1000);