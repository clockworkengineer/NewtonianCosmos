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

    // File systems extra package

    const fs = require('fs-extra');

    // Task Process Utils

    const TPU = require('./FPE_taskProcessUtil.js');

    // 
    // =====================
    // MESSAGE EVENT HANDLER
    // =====================
    //

    //
    // Copy file to all specified destinations in array
    //

    process.on('message', function (message) {

        let srcFileName = message.fileName;
        let dstFileName = destinationFolder[0] + message.fileName.substr(watchFolder.length);
        let filesCopied = 0;

        for (let dest in destinationFolder) {

            dstFileName = destinationFolder[dest] + message.fileName.substr(watchFolder.length);

            console.log('Copying file [%s] To [%s].', srcFileName, dstFileName);

            fs.copy(srcFileName, dstFileName, function (err) {
                if (err) {
                    console.error(err);
                } else {
                    console.log('File copy complete.');
                    filesCopied++;
                }
                if (filesCopied === destinationFolder.length) {  // Last file copied signal for more
                    TPU.sendStatus(TPU.statusSend);              // File complete send more
                    if (message.deleteSource) {                  // Delete Source if specified
                        TPU.deleteSourceFile(srcFileName);
                    }
                    filesCopied = 0;
                }

            });

        }

    });

    //
    // =========
    // MAIN CODE
    // =========
    //

    // Process closedown

    function processCloseDown(callback) {

        try {
            console.log("File Copy Task Closedown.");
        } catch (err) {
            callback(err);
        }

    }

    // Setup process exit handlers.

    TPU.processExitHandlers(processCloseDown);
    
    // Setup destiantion and watch fodlers.

    var destinationFolder = process.argv[2];
    var watchFolder = process.argv[3];

    // Convert destination string to array as it may contain multiple destinations ('dest1, dest2...')
    // Also create desination folders if needed.
    
    destinationFolder = destinationFolder.split(',');
    for (let dest in destinationFolder) {
        TPU.createFolder(destinationFolder[dest]);
    }


})(process.env.TASKCHILD);

// ======================
// TASK PROCESS SIGNATURE
// ======================

var CopyFilesTask = {

    signature: function () {
        return({
            taskName: 'File Copier',
            watchFolder: global.commandLine.options.watch,
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest]},
            chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
            deleteSource: global.commandLine.options.delete, // OPTIONAL
            runTask: false                                  // true =  run task (for FPE_MAIN IGNORED BY TASK)
        });

    }

};

module.exports = CopyFilesTask;

