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

//var console = require("./FPE_logging.js");

// Program enviroment

var environment = require("./FPE_environment.js");

// tasks class

var task = require("./FPE_tasks.js").task;

// Simple file copy from watch folder to desintation.

var tsk1 = new task(
        {
            taskName : "File Copier",
            watchFolder: environment.options.watchFolder,
            processDetails: {prog: "node", args: ["./FPE_copyFiles.js", environment.options.destinationFolder]}
        }); 

// Video encoding using handbrake.

var tsk2 = new task(
        {
            taskName : "Video File Conversion",
            watchFolder: "WatchFolderVideos",
            processDetails : {prog: 'node', args: ["./FPE_handbrake.js", "destinationConverted", '{ ".mkv" : true, ".avi" : true, ".mp4" : true}']}
        });

var tsk3 = new task(
        {
            taskName : "File ePrinter",
            watchFolder: "ePrintWatch",
            processDetails : {prog: 'node', args: ["./FPE_eprint.js",'{ ".docx" : true, ".rtf" : true, ".txt" : true}']}
        }); 

// Clean up processing.

process.on("exit", function () {
    
    console.log(environment.programName + " Applciation Exiting.");
    
    tsk1.destroy();
    tsk2.destroy();
    tsk3.destroy();
    
});

console.log(environment.programName + " Started.");

console.log("Default Watcher Folder = " + environment.options.watchFolder);
console.log("Default Destination Folder = " + environment.options.destinationFolder);

