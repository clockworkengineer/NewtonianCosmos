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

const path = require('path');

// File systems extra package

const fs = require('fs-extra');

// File watch modules

const chokidar = require('chokidar');

// Child processes

const child_process = require('child_process');

// Event Emitter

const events = require('events');
const util = require('util');

//
// =======================
// PRIVATE CLASS FUNCTIONS
// =======================
//
// Note these work by accessing a local Task object called _Task which is passed to each function.
//

//
// Add file to be processed queue 
//

function _addFileToQueue(_Task, fileName) {
    _Task.filesToProcess.push({fileName: fileName, deleteSource: _Task.deleteSource});
    if (_Task.status) {  // 1=Send file direct, 0=queue file.
        _sendFileToProcess(_Task);
    }
}

//
// Send file to child process. Set status = 0 (task queue files while process clears queue)
//

function _sendFileToProcess(_Task) {
    let file = _Task.filesToProcess.shift();
    _Task.status = 0;
    if (_Task.child && _Task.child.connected) {
        _Task.child.send(file, function (err) {
            if (err) {
                _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
            }
        });
    }
}

//
// Makes sure that the file added to the directory (but may not have been completely 
// copied yet by the Operating System) finishes being copied before it attempts to do 
// anything with the file. This used to use stat to see whether the file modified time
// has stopped changing but that seems to be unreliable when copying in multiple large
// files so what I decided to do was actually get the file lock with an open for read. 
// If the file is still being copied it returns file busy and we try again later. As
// soon as we can get the lock (file has finished copying) close it and start proessing.
//

function _checkFileCopyComplete(_Task, fileName) {

    fs.open(fileName, 'r', function (err, fd) {
        if (err) {
            if (err.code === 'EBUSY') {
                console.log(_Task.logPrefix + 'File ' + fileName + ' busy READ.Waiting for it to free up.');
                setTimeout(_checkFileCopyComplete, _Task.kFileCopyDelaySeconds * 1000, _Task, fileName);
            } else {
                _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
            }
        } else {
            fs.close(fd, function (err) {
                if (err) {
                    _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
                }
            });
            _addFileToQueue(_Task, fileName);
        }
    });

}

//
// Create folder watcher 
//

function _createFolderWatcher(_Task) {

    _Task.watcher = chokidar.watch(_Task.watchFolder, _Task.chokidarOptions);

    _Task.watcher
            .on('ready', function () {
                console.log(_Task.logPrefix + 'Initial scan complete. Ready for changes.');
            })
            .on('unlink', function (fileName) {
                console.log(_Task.logPrefix + 'File: ' + fileName + ', has been REMOVED');
            })
            .on('error', function (err) {
                _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
            })
            .on('change', function (path, stats) {
                if (stats) {
                    console.log(_Task.logPrefix + `File ${path} changed size to ${stats.size}`);
                }
            })
            .on('add', function (fileName) {
                console.log(_Task.logPrefix + 'File copy started...');
                console.log(_Task.logPrefix + 'File added ' + fileName);
                setTimeout(_checkFileCopyComplete, _Task.kFileCopyDelaySeconds * 1000,  _Task, fileName);
            });


}

//
// Spawn child process and setup event handling
//

function _createChildProcess(_Task) {

    _Task.child = child_process.spawn(_Task.processDetails.prog, _Task.processDetails.args, {stdio: ['pipe', 'pipe', 'pipe', 'ipc'], env : { TASKCHILD : 1 }});

    _Task.child.stdout.on('data', function (data) {
        // Remove extra "\n"
        data = data.slice(0, data.length - 1);
        console.log((_Task.logPrefix + `${data}`));
    });

    _Task.child.stderr.on('data', function (data) {
          _Task.self.emit('error', _Task.logPrefix + data);
    });

    _Task.child.on('close', function (code) {
        console.log(_Task.logPrefix + 'Child closed down');
        if (_Task.watcher) {
            _Task.watcher.close();
        }
        _Task.child = undefined;
        _Task.watcher = undefined;
        _Task.self.emit('close', _Task.taskName);
    });

    _Task.child.on('error', function (err) {
        _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
    });

    _Task.child.on('message', function (message) {
        if (_Task.filesToProcess.length) {   // Files in queue
            _sendFileToProcess(_Task);
        } else {                        // queue empty send next file direct
            _Task.status = 1;
        }
    });

}

//
// Create watch folder (use Sync as we want the folder to be in place for watches)
//

function _createWatchFolder (_Task) {
    
    try {

        if (!fs.existsSync(_Task.watchFolder)) {
            console.log(_Task.logPrefix + 'Creating watch folder %s.', _Task.watchFolder);
            fs.mkdirpSync(_Task.watchFolder);
        }

    } catch (err) {

        if (err) {
            _Task.self.emit('error', new Error(_Task.logPrefix + err.message));
            return; // Error creating watch folder return;
        }

    }
}

// ======================
// Task object definition
// ======================

var Task = function (task) {

    
    // === PRIVATE CONSTANTS AND VARIABLES === 

    // All private variables stored here are passed to private functions defined above.
    // This is to allow functions to be defined outside of the object constructor and 
    // still have access to its private data. Note also access is still given to the 
    // object through _Task.self
    
    var _Task = {
        self: this,                          // Self for object reference.
        kFileCopyDelaySeconds: 1,            // Poll time for file copied check (secs)
        watchFolder: task.watchFolder,       // Task watch folder
        processDetails: task.processDetails, // Child process detail
        watcher: 0,                          // Task file watcher
        child: 0,                            // Task child process 
        filesToProcess : [],                  // Files to process 
        taskName: task.taskName,             // Task name
        status: 1,                           // Queue status 1=send file name to process, 0=queue file name 
        chokidarOptions: {},                 // Chokidar options
        deleteSource: false,                 // Delete Source File after processed
        logPrefix: 'Task [' + task.taskName + ']: '
    };

    // === PRIVATE METHODS ===
    
    // NONE

    // === CLASS INSTANCE VARIABLES ===

    // NONE

    // === CLASS METHODS ===

    // Cleanup/destoy function for task

    this.destroy = function () {

        if (_Task.child) {
            console.log(_Task.logPrefix + 'Task child process killed.');
            _Task.child.kill();
            _Task.child = undefined;
        }

        if (_Task.watcher) {
            console.log(_Task.logPrefix + 'Task watcher closed.');
            _Task.watcher.close();
            _Task.watcher = undefined;
        }

    };
    
    // Create Folder Watcher & spawn child process
    
    this.start = function () {

        _createFolderWatcher(_Task);
        _createChildProcess(_Task);
        
    };
    
    // === INSTANCE CONSTRUCTOR CODE ===

    // Task child class of EventEmmitter to signal errors with events

    events.EventEmitter.call(this);

    // Create Watch Folder

    _createWatchFolder(_Task);
    
    // Attach watch folder to arg list

    _Task.processDetails.args.push(task.watchFolder);

    // Override file watch options if passed.

    if (!task.chokidarOptions) {
        _Task.chokidarOptions = {ignored: /[\/\\]\./, ignoreInitial: true, persistent: true};
        console.log(_Task.logPrefix + 'Using Default Chokidar options.');
    } else {
        _Task._chokidarOptions = task.chokidarOptions;
        console.log(_Task.logPrefix + 'Overwriting Chokidar options.');
    }

    // Set delete source flag

    if (task.deleteSource) {
        _Task.deleteSource = task.deleteSource;
    }

};

// Task child class of EventEmmitter to signal errors

util.inherits(Task, events.EventEmitter);

module.exports = Task;