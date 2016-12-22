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

(function TASKPROCESS(run) {

    // Not a child process so don't run.

    if (!run) {
        return;
    }

    // Node path module

    const path = require('path');

    // File systems extra package

    const fs = require('fs-extra');

    // Task Process Utils

    const TPU = require('./FPE_taskProcessUtil.js');
  
    //
    // ================
    // UNPACK ARGUMENTS
    // ================
    //
 
    // Setup watch and default destination folder and parse file extension destination JSON

    var destinationFolder = process.argv[2];
    var watchFolder = process.argv[4];
    var destinationForExt = TPU.parseJSON(process.argv[3]);

    //
    // =====================
    // MESSAGE EVENT HANDLER
    // =====================
    //

    //
    // Process file. If extension destination not specified copy to default
    //

    process.on('message', function (message) {

        let srcFileName = message.fileName;
        let dstFileName;

        if (!destinationForExt[path.parse(srcFileName).ext]) {
            dstFileName = destinationFolder + message.fileName.substr(watchFolder.length);
        } else {
            dstFileName = destinationForExt[path.parse(srcFileName).ext] + message.fileName.substr(watchFolder.length);
        }

        console.log('Copying file [%s] To [%s].', srcFileName, dstFileName);

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

    //
    // =========
    // MAIN CODE
    // =========
    //

    // Process closedown

    function processCloseDown(callback) {

        try {
            console.log("File Copier On Extension Closedown.");
        } catch (err) {
            callback(err);
        }

    }

    // Setup process exit handlers.

    TPU.processExitHandlers(processCloseDown);

     // Create default desination folder if needed

    TPU.createFolder(destinationFolder);

    // Create destination folders for individual extensions if needed

    for (let dest in destinationForExt) {
        TPU.createFolder(destinationForExt[dest]);
    }

})(process.env.TASKCHILD);

// ======================
// TASK PROCESS SIGNATURE
// ======================

var CopyFilesOnExt = {

    signature: function () {
        return({
            taskName: 'File Copier On Extension',
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest, '{ ".docx" : "documents" }']},
        });
    }

};

module.exports = CopyFilesOnExt;
