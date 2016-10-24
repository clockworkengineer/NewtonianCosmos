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

// Program enviroment

var environment = require("./FPE_environment.js");

// tasks class

var tasks = require("./FPE_tasks.js");

// Simple file copy from watch folder to desintation.

var tsk1 = new tasks.task(
        {
            taskName : "File Copier",
            watchFolder: environment.options.watchFolder,
            destinationFolder: environment.options.destinationFolder,
            processDetails: {prog: "node", args: ["./FPE_copyFiles.js"]}
        });

// Video encoding using handbrake.

var tsk2 = new tasks.task(
        {
            taskName : "Video File Conversion",
            watchFolder: "WatchFolderVideos",
            destinationFolder: "destinationConverted",
            processDetails : {prog: 'node', args: ["./FPE_handbrake.js", '{ ".mkv" : true, ".avi" : true, ".mp4" : true}']}
        });


// Clean up processing.

process.on("exit", function () {
    
    console.log(environment.programName + " Applciation Exiting.");
    
    tsk1.destroy();
    tsk2.destroy();
    
});

console.log(environment.programName + " Started.");

console.log("Default Watcher Folder = " + environment.options.watchFolder);
console.log("Default Destination Folder = " + environment.options.destinationFolder);

