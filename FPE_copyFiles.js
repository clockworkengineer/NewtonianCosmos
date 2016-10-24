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

// Node path module

var path = require("path");

// File systems extra package

var fs = require("fs-extra");

// Setup watch and destination folder

var watchFolder = process.argv[2];
var destinationFolder = process.argv[3];
var taskName = process.argv[4];

// Convert destination string to array as it may contain multiple destinations ("dest1, dest2...")

destinationFolder = destinationFolder.split(",");

// Files copied in this pass

var filesCopied = 0;

// Copy file to all specified destinations in array

process.on('message', function (message) {

    var srcFileName = message.fileName;
    var dstFileName = destinationFolder[0] + message.fileName.substr(watchFolder.length);

    for (var dest in destinationFolder) {

        dstFileName = destinationFolder[dest] + message.fileName.substr(watchFolder.length);

        process.stdout.write("Copying file " + srcFileName + " To " + dstFileName + ".");

        fs.copy(srcFileName, dstFileName, function (err) {
            if (err) {
                process.stderr.write(err);
            } else {
                process.stdout.write("File copy complete.");
                filesCopied++;
            }
            if (filesCopied === destinationFolder.length) { // Last file copied signal for more
                process.send({status: 1});
                filesCopied = 0;
            }
        });

    }

});
