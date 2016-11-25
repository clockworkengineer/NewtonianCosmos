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

//var console = require('./FPE_logging.js');

// File systems extra package

var fs = require('fs-extra');

// Task Process Utils

var TPU = require('./FPE_taskProcessUtil.js');

//
// =========
// MAIN CODE
// =========
//


// Setup watch and destination folder

var destinationFolder = process.argv[2];
var watchFolder = process.argv[3];

// Convert destination string to array as it may contain multiple destinations ('dest1, dest2...')
// Also create desintion folders if needed.

destinationFolder = destinationFolder.split(',');
for (let dest in destinationFolder) {
   TPU.createFolder(destinationFolder[dest]);
}

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

    TPU.sendStatus(TPU.statusWait);  // Signal file being processed so stop sending more.

    for (let dest in destinationFolder) {

        dstFileName = destinationFolder[dest] + message.fileName.substr(watchFolder.length);

        console.log('Copying file ' + srcFileName + ' To ' + dstFileName + '.');

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
