'use strict';
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

//var console = require("./logging.js");

// Node imports

var path = require("path");
var fs = require('fs-extra');

// File watch modules

var chokidar = require("chokidar");

// Child processes

var child_process = require('child_process');

exports.task = function (task) {

    // === CLASS INSTANCE VARIABLES ===

    // Everything can be private
    
    // === CLASS METHODS ===
    
    // Need a cleanup/desroy function for task
    
    this.destroy = function () {
        
        console.log("Task [" + taskName + "]:" + "Task child process killed.");
        child.kill();
        console.log("Task [" + taskName + "]:" + "Task watcher process closed.");
        watcher.close();
        
    }

    // === PRIVATE CONSTANTS AND VARIABLES === 

    var kFileCopyDelaySeconds = 1;              // Poll time for file copied check (secs)
    var kProcessFilesDelay = 180;               // Poll time for flush queued files (secs)

    var watchFolder = task.watchFolder;             // Task watch folder
    var destinationFolder = task.destinationFolder; // Task destination folder

    var process = task.processDetails;          // Child process details

    process.args.push(task.watchFolder);        // Attach watch & destination folder to arg list
    process.args.push(task.destinationFolder);

    var watcher;                                // Task file watcher

    var child;                                  // Task child process 

    var filesToProcess = [];                    // Files to process 

    var taskName = task.taskName;               // Task name

    // Current processing status (1=rdy to recieve files, 0=proessing ton't send)

    var status = 1;

    // === PRIVATE METHODS ===

    // Add file to be processed list 

    var processFile = function (fileName) {

        filesToProcess.push({fileName: fileName});

    };

    // Take files and add to active list

    var flushFilesToProcess = function () {

        processFiles();

        setTimeout(flushFilesToProcess, kProcessFilesDelay * 1000);

    };

    // Send file to child process

    var processFiles = function () {

        if (status && filesToProcess.length) { // Still files to be processed (take head and send)
            var file = filesToProcess.shift();
            child.send(file);
        }

    };

    // Makes sure that the file added to the directory, but may not have been completely 
    // copied yet by the Operating System, finishes being copied before it attempts to do 
    // anything with the file. This used to use stat to see whether the file modified time
    // has stopped changing but that seems to be unreliable when copying in multiple large
    // files so what I decided to do was actually get the file lock with an open for read. 
    // If the file is still being copied it returns file busy and we try again later. As
    // soon as we can get the lock (file has finished copying) close it and start proessing.

    var checkFileCopyComplete = function (fileName) {

        fs.open(fileName, 'r', function (err, fd) {

            if (err) {
                if (err.code === 'EBUSY') {
                    console.log("Task [" + taskName + "]:" + "File " + fileName + " busy READ.Waiting for it to free up.");
                    setTimeout(checkFileCopyComplete, kFileCopyDelaySeconds * 1000, fileName);
                } else {
                    console.error("Task [" + taskName + "]:" + err);
                }
            } else {
                fs.close(fd);
                processFile(fileName);
            }

        });

    };

    // === INSTANCE CONSTRUCTOR CODE ===

    // Create watch and destination folders

    if (!fs.existsSync(watchFolder)) {
        console.log("Task [" + taskName + "]:" + "Creating watch folder %s.", watchFolder);
        fs.mkdir(watchFolder);
    }
    
    // Convert destination string to array as it may contain multiple destinations ("dest1, dest2...")
    
    destinationFolder = destinationFolder.split(",");
    
    for (var dest in destinationFolder) {

        if (!fs.existsSync(destinationFolder[dest])) {
            console.log("Task [" + taskName + "]:" + "Creating destination folder. %s", destinationFolder[dest]);
            fs.mkdir(destinationFolder[dest]);
        }

    }

    // Create folder watcher 

    watcher = chokidar.watch(watchFolder, {
        ignored: /[\/\\]\./,
        ignoreInitial: false,
        persistent: true
    });

    watcher
            .on('ready', function () {
                console.log("Task [" + taskName + "]:" + 'Initial scan complete. Ready for changes.\n');
            })
            .on('unlink', function (fileName) {
                console.log("Task [" + taskName + "]:" + 'File: ' + fileName + ', has been REMOVED');
            })
            .on('error', function (err) {
                console.error("Task [" + taskName + "]:" + 'Chokidar file watcher failed. ERR: ' + err.message);
            })
            .on('change', function (path, stats) {
                if (stats)
                    console.log("Task [" + taskName + "]:" + `File ${path} changed size to ${stats.size}`);
            })
            .on("add", function (fileName) {
                console.log("Task [" + taskName + "]:" + 'File copy started...');
                console.log("Task [" + taskName + "]:" + "File added " + fileName);
                setTimeout(checkFileCopyComplete, kFileCopyDelaySeconds * 1000, fileName);
            });

    // Spawn child process and setup event handling

    child = child_process.spawn(process.prog, process.args, {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

    child.stdout.on('data', function (data) {
        console.log("Task [" + taskName + "]:" + `${data}`);
    });

    child.stderr.on('data', function (data) {
        console.error("Task [" + taskName + "]:" + `${data}`);
    });

    child.on('close', function (code) {
        console.log("Task [" + taskName + "]:" + "Child closed down");
    });

    child.on('message', function (message) {
        status = message.status;
        if (status === 1) { // status == 1 send more files
            processFiles();
        }
    });

    // Start checking files to be processed list

    setTimeout(flushFilesToProcess, kProcessFilesDelay * 1000);


};
