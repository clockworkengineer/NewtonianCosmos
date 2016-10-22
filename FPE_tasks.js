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

// Node specific imports

var path = require("path");
var fs = require('fs-extra');

// File watch modules

var chokidar = require("chokidar");

// Child processes

var child_process = require('child_process');

exports.task = function (task) {

    this.watchFolder = task.watchFolder;         // Task watch folder
    this.destationFolder = task.destationFolder; // Task destination folder

    this.process = task.processDetails;          // Child process details
    this.process.args.push(task.watchFolder);
    this.process.args.push(task.destationFolder);

    this.filesToProcess = [];                    // Files to process 

    var kFileCopyDelaySeconds = 1;
    var kProcessFilesDelay = 180; 
    
    // Current processing status (1=rdy to recieve files, 0=proessing ton't send)
    
    var status=1;

    // Add file to be processed list 

    var processFile = function (fileName) {

        this.filesToProcess.push({fileName: fileName});

    }.bind(this);

    // Take files and add to active list

    var flushFilesToProcess = function () {
 
        processFiles();
        
        setTimeout(flushFilesToProcess, kProcessFilesDelay * 1000);

    }.bind(this);

    // Send file to child process

    var processFiles = function () {
  
       if (status && this.filesToProcess.length) { // Still files to be processed (take head and send)
            var file = this.filesToProcess.shift();
            this.child.send(file);
        }


    }.bind(this);

    // Makes sure that the file added to the directory, but may not have been completely 
    // copied yet by the Operating System, finishes being copied before it attempts to do 
    // anything with the file. This used to use stat to see whether the file modified time
    // has stopped changing but that seems to be unreliable when copying in multiple large
    // files so what I decided to do was actually get the file lock with an open for append. 
    // If the file is still being copied it returns file busy and we try again later. As
    // soon as we can get the lock (file has finished copying) close it and start proessing.
    // When we open append the file will not be truncated and we no that it exists because we
    // got the watcher event.

    var checkFileCopyComplete = function (fileName) {

        fs.open(fileName, 'a', function (err, fd) {

            if (err) {
                if (err.code === 'EBUSY') {
                    console.log("File " + fileName + " busy.Waiting for it to free up.");
                    setTimeout(checkFileCopyComplete, kFileCopyDelaySeconds * 1000, fileName);
                } else {
                    console.error(err);
                }
            } else {
                fs.close(fd);
                processFile(fileName);
            }

        });

    };

    // Create watch and destination folders

    if (!fs.existsSync(this.watchFolder)) {
        console.log("Creating watch folder %s.", this.watchFolder);
        fs.mkdir(this.watchFolder);
    }

    if (!fs.existsSync(this.destationFolder)) {
        console.log("Creating destination folder. %s", this.destationFolder);
        fs.mkdir(this.destationFolder);
    }

    // Create folder watcher 

    this.watcher = chokidar.watch(this.watchFolder, {
        ignored: /[\/\\]\./,
        ignoreInitial: true,
        persistent: true
    });

    this.watcher
            .on('ready', function () {
                console.log('Initial scan complete. Ready for changes.\n');
            })
            .on('unlink', function (fileName) {
                console.log('File: ' + fileName + ', has been REMOVED');
            })
            .on('error', function (err) {
                console.error('Chokidar file watcher failed. ERR: ' + err.message);
            })
            .on('change', function (path, stats) {
                if (stats)
                    console.log(`File ${path} changed size to ${stats.size}`);
            })
            .on("add", function (fileName) {
                console.log('File copy started...');
                console.log("File added " + fileName);
                setTimeout(checkFileCopyComplete, kFileCopyDelaySeconds * 1000, fileName);
            });

    // Spawn child process and setup event handling

    this.child = child_process.spawn(this.process.prog, this.process.args, {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

    this.child.stdout.on('data', function (data) {
        console.log(`${data}`);
    });

    this.child.stderr.on('data', function (data) {
        console.error(`${data}`);
    });

    this.child.on('close', function (code) {
        console.log("Child closed down");
    });

    this.child.on('message', function (message) {
        status = message.status;
        if (status === 1) { // status == 1 send more files
            processFiles();
        }
    });

    // Start checking files to be processed list

    setTimeout(flushFilesToProcess, kProcessFilesDelay * 1000);


};
