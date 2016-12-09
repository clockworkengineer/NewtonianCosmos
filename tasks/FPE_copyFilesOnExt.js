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

// Node path module

const path = require('path');

// File systems extra package

const fs = require('fs-extra');

// Task Process Utils

const TPU = require('./FPE_taskProcessUtil.js');

//
// =========
// MAIN CODE
// =========
//

// Watch and destination folders

var destinationFolder;
var watchFolder;

// File extension to destination folder mapping

var destinationForExt;

//
// On first call to message handler setup processing.
//

var onFirstMessage = function () {

    // Setup watch and default destination folder and parse file extension destination JSON

    destinationFolder = process.argv[2];
    watchFolder = process.argv[4];
    destinationForExt = TPU.parseJSON(process.argv[3]);

    // Create default desination folder if needed

    TPU.createFolder(destinationFolder);

    // Create destination folders for individual extensions if needed

    for (let dest in destinationForExt) {
        TPU.createFolder(destinationForExt[dest]);
    }

    onFirstMessage = undefined;

};

//
// =====================
// MESSAGE EVENT HANDLER
// =====================
//

//
// Process file. If extension destination not specified copy to default
//

process.on('message', function (message) {

    // On first call setup process data

    if (onFirstMessage) {
        onFirstMessage();
    }

    let srcFileName = message.fileName;
    let dstFileName;

    if (!destinationForExt[path.parse(srcFileName).ext]) {
        dstFileName = destinationFolder + message.fileName.substr(watchFolder.length);
    } else {
        dstFileName = destinationForExt[path.parse(srcFileName).ext] + message.fileName.substr(watchFolder.length);
    }

    console.log('Copying file ' + srcFileName + ' To ' + dstFileName + '.');

    fs.copy(srcFileName, dstFileName, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('File copy complete.');
        }
        TPU.sendStatus(TPU.statusSend);         // File complete send more
        if (message.deleteSource) {             // Delete Source if specified
            TPU.deleteSourceFile(srcFileName);
        }

    });

});

if (global.commandLine) {

    var CopyFilesOnExt = {

        signature:
                {
                    taskName: 'File Copier On Extension',
                    watchFolder: global.commandLine.options.watch,
                    processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest, '{ ".docx" : "documents" }']},
                    chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
                    deleteSource: global.commandLine.options.delete, // OPTIONAL
                    runTask: false                                  // true =  run task (for FPE_MAIN IGNORED BY TASK)
                }
    };

    module.exports = CopyFilesOnExt;

}