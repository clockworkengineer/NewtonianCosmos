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

// Node path handling

var path = require('path');

// File systems extra package

var fs = require('fs-extra');

// File watch modules

var chokidar = require('chokidar');

// Child processes

var child_process = require('child_process');

// Event Emitter

var events = require('events');
var util = require('util');

// task object definition

var Task = function (task) {

    // === CLASS INSTANCE VARIABLES ===

    // Everything can be private

    // === CLASS METHODS ===

    // Cleanup/destoy function for task

    this.destroy = function () {
        
        console.log(_logPrefix + 'Task child process killed.');
        _child.kill();
        console.log(_logPrefix + 'Task watcher closed.');
        _watcher.close();

    };

    // === PRIVATE CONSTANTS AND VARIABLES === 

    var _kFileCopyDelaySeconds = 1;              // Poll time for file copied check (secs)
    var _watchFolder = task.watchFolder;         // Task watch folder
    var _processDetails = task.processDetails;   // Child process detail
    var _watcher;                                // Task file watcher
    var _child;                                  // Task child process 
    var _filesToProcess = [];                    // Files to process 
    var _taskName = task.taskName;               // Task name
    var _status = 1;                             // Current child process _status (1=rdy to recieve files, 
                                                 // 0=proessing files don't send 
    var _self = this;                            // Self reference for emits
    var _chokidarOptions = {};                   // Chokidar options
    var _deleteSource=false;                     // Delete Source File after processed
  
    // Task name prefix to all output
    
    const _logPrefix = 'Task [' + _taskName + ']: ';
    
    // === PRIVATE METHODS ===

    //
    // Add file to be processed queue 
    //
    
    function _addFileToQueue(fileName) {
        _filesToProcess.push({fileName: fileName, deleteSource: _deleteSource });
        if (_status) {  // 1=Send file direct, 0=queue file.
            _sendFileToProcess();
        }
    };

    //
    // Send file to child process. Set status = 0 (task queue files while process clears queue)
    //
    
    function _sendFileToProcess() {
            let file = _filesToProcess.shift();
            _status=0;
            _child.send(file, function (err) {
                if (err) {
                    _self.emit('error', new Error(_logPrefix + err.message));
                }
            });
    };

    //
    // Makes sure that the file added to the directory (but may not have been completely 
    // copied yet by the Operating System) finishes being copied before it attempts to do 
    // anything with the file. This used to use stat to see whether the file modified time
    // has stopped changing but that seems to be unreliable when copying in multiple large
    // files so what I decided to do was actually get the file lock with an open for read. 
    // If the file is still being copied it returns file busy and we try again later. As
    // soon as we can get the lock (file has finished copying) close it and start proessing.
    //

    function _checkFileCopyComplete(fileName) {

        fs.open(fileName, 'r', function (err, fd) {
            if (err) {
                if (err.code === 'EBUSY') {
                    console.log(_logPrefix + 'File ' + fileName + ' busy READ.Waiting for it to free up.');
                    setTimeout(_checkFileCopyComplete, _kFileCopyDelaySeconds * 1000, fileName);
                } else {
                    _self.emit('error', new Error(_logPrefix + err.message));
                }
            } else {
                fs.close(fd, function (err) {
                    if (err) {
                        _self.emit('error', new Error(_logPrefix + err.message));
                    }
                });
                _addFileToQueue(fileName);
            }
        });
        
    };

    //
    // Create folder watcher 
    //
    
    function _createFolderWatcher() {

        _watcher = chokidar.watch(_watchFolder, _chokidarOptions);

        _watcher
                .on('ready', function () {
                    console.log(_logPrefix + 'Initial scan complete. Ready for changes.');
                })
                .on('unlink', function (fileName) {
                    console.log(_logPrefix + 'File: ' + fileName + ', has been REMOVED');
                })
                .on('error', function (err) {
                    _self.emit('error', new Error(_logPrefix + err.message));
                })
                .on('change', function (path, stats) {
                    if (stats) {
                        console.log(_logPrefix + `File ${path} changed size to ${stats.size}`);
                    }
                })
                .on('add', function (fileName) {
                    console.log(_logPrefix + 'File copy started...');
                    console.log(_logPrefix + 'File added ' + fileName);
                    setTimeout(_checkFileCopyComplete, _kFileCopyDelaySeconds * 1000, fileName);
                });


    };

    //
    // Spawn child process and setup event handling
    //
    
    function _createChildProcess() {

        _child = child_process.spawn(_processDetails.prog, _processDetails.args, {stdio: ['pipe', 'pipe', 'pipe', 'ipc']});

        _child.stdout.on('data', function (data) {
           // Remove extra "\n"
           data = data.slice(0, data.length - 1);
           console.log((_logPrefix + `${data}`));
        });

        _child.stderr.on('data', function (data) {
            _self.emit('error', new Error(_logPrefix  + data));
        });

        _child.on('close', function (code) {
            console.log(_logPrefix + 'Child closed down');
        });

        _child.on('error', function (err) {
            _self.emit('error', new Error(_logPrefix + err.message));
        });

        _child.on('message', function (message) {
            if (_filesToProcess.length) {   // Files in queue
                _sendFileToProcess();
            } else {                        // queue empty send next file direct
                _status=1;
            }
        });

    };

    // === INSTANCE CONSTRUCTOR CODE ===

    console.log("NOTE: OLD VERSION OF TASK CLASS. HAS BEEN SUPERSEDED BY FPE_TASK.JS");
    
    // Task child class of EventEmmitter to signal errors with events

    events.EventEmitter.call(this);

    // Create watch folder (use Sync as we want the folder to be in place for watches

    try {

        if (!fs.existsSync(_watchFolder)) {
            console.log(_logPrefix + 'Creating watch folder %s.', _watchFolder);
            fs.mkdirpSync(_watchFolder);
        }

    } catch (err) {
        
        if (err) {
            _self.emit('error', new Error(_logPrefix + err.message));
            return; // Error creating watch folder return;
        }

    }
    
    // Attach watch folder to arg list
    
    _processDetails.args.push(task.watchFolder); 

    // Override file watch options if passed.
    
   if (!task.chokidarOptions) {
        _chokidarOptions = { ignored: /[\/\\]\./, ignoreInitial: true, persistent: true };
         console.log(_logPrefix + 'Using Default Chokidar options.');
    } else {
        _chokidarOptions = task.chokidarOptions;
        console.log(_logPrefix + 'Overwriting Chokidar options.');
    }
    
    // Set delete source flag
    
    if (task.deleteSource) {
        _deleteSource=task.deleteSource;
    }
    
    // Create Folder Watcher & spawn child process

    _createFolderWatcher();
    _createChildProcess();

};

// Task child class of EventEmmitter to signal errors

util.inherits(Task, events.EventEmitter);

module.exports = Task;