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

// Node specific imports

var path = require("path");

// File systems extra package

//var fs = require("fs-extra");

// Handbrake video  processing package

var hbjs = require("handbrake-js");

// Setup source and destination file names. Only convert from .mkv to .mp4 here.

process.on('message', function (message) {

    var srcFileName = message.fileName;
    var dstFileName = message.destinationFolder + "\\" + path.parse(message.fileName).name + ".mp4";
 
    if (path.parse(srcFileName).ext === ".mkv") {

        process.send({status: 0});

        console.log("Converting " + srcFileName + " to " + dstFileName);

        hbjs.spawn({input: srcFileName, output: dstFileName})
                .on("error", function (err) {
                    // invalid user input, no video found etc 
                    process.send({status: err});
                })
                .on("complete", function () {
                    process.send({status: 1});
                })
                .on("progress", function (progress) {
                    console.log(
                            "Percent complete: %s, ETA: %s",
                            progress.percentComplete,
                            progress.eta
                            );
                });

    } else { 
        process.send({status: 1});
   }


});   