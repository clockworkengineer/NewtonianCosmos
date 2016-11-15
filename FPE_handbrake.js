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

// Node specific imports

var path = require("path");

// Handbrake video  processing package

var hbjs = require("handbrake-js");

// File systems extra package

var fs = require("fs-extra");

// Setup destination and allowed file formats to convert

var destinationFolder = process.argv[2];
var fileFormats = JSON.parse(process.argv[3]);
var watchFolder = process.argv[4];

// Create desination folder if needed

if (!fs.existsSync(destinationFolder)) {
    console.log("Creating destination folder. %s", destinationFolder);
    fs.mkdir(destinationFolder, function (err) {
        if (err) {
            console.error(err);
        }
    });

}

//
// Send satus reply to parent (1=rdy to recieve files, 0=proessing don't send)
//

function processSendStatus(value) {

    process.send({status: value}, function (err) {  // Signal file being processed so stop sending more.
        if (err) {
            console.error(err);
        }
    });

};

// 
// Convert video file using handbrake.
//

process.on('message', function (message) {

    var srcFileName = message.fileName;
    var dstFileName = destinationFolder + "\\" + path.parse(message.fileName).name + ".mp4";

    if (fileFormats[path.parse(srcFileName).ext]) {

        processSendStatus(0);  // Signal file being processed so stop sending more.
    
        console.log("Converting " + srcFileName + " to " + dstFileName);

        hbjs.spawn({input: srcFileName, output: dstFileName, preset: 'Normal'})
                .on("error", function (err) {
                    console.error(err);
                    processSendStatus(1);  // Failure but send more
                })
                .on("complete", function () {
                    console.log("Conversion complete.");
                    processSendStatus(1);  // File complete send more
                });

    } else {
        processSendStatus(1);  // File format not supported send another
    }

});   