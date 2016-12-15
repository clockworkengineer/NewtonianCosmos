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

// File systems extra package

const fs = require('fs-extra');

const taskProcessUtil = {

    //
    // Send satus reply to parent (1=Send another file)
    //

    statusSend: 1,

    sendStatus: function (value) {

        process.send({status: value}, function (err) {
            if (err) {
                console.error(err);
                process.exit(1);  // Closedown child process
            }
        });

    },

    //
    // Delete source file
    //

    deleteSourceFile: function (srcFileName) {

        console.log('Delete Source %s.', srcFileName);
        fs.unlink(srcFileName, function (err) {
            if (err) {
                console.error(err);
            }
        });

    },

    //
    // Create a folder
    //

    createFolder: function (folderName) {
        try {
            if (!fs.existsSync(folderName)) {
                console.log('Creating Folder. %s', folderName);
                fs.mkdirSync(folderName);
            }
        } catch (err) {
            console.error(err);
            process.exit(1);  // Closedown child process
        }

    },

    //
    // Parse JSON String
    //

    parseJSON: function (jsonString) {
        try {
            return(JSON.parse(jsonString));
        } catch (err) {
            console.error('Parsing JSON error stopping process : ' + err);
            process.exit(1);  // Closedown child process
        }
    },

    //
    // Read JSON file and parse.
    //

    readJSONFile: function (fileName, fileFormat) {

        try {

            return(JSON.parse(fs.readFileSync(fileName, 'utf8')));

        } catch (err) {

            if (err.code === 'ENOENT') {
                console.log(fileName + ' not found.');
                console.log('Contents should be:' + fileFormat);
            } else {
                console.error(err);
            }

            // Do not go any further in handling files

            process.exit(1);

        }
    },

    //
    // Process exit handlers (this needs a rework)
    //

    processExitHandlers: function (processCloseDown) {

        process.on('exit', function () {

            processCloseDown(function (err) {
                if (err) {
                    console.error('ERROR WHILE CLOSING DOWN:', err.stack || err);
                }
            });

            process.exit(0);

        });

        //
        // On mutliple uncaught exceptions report
        //

        process.on('uncaughtException', function (err) {
            console.error('UNCAUGHT EXCEPTION:', err.stack || err);
        });

        //
        // On first uncaught exception close down and exit
        //

        process.once('uncaughtException', function (err) {

            processCloseDown(function (err) {
                if (err) {
                    console.error('ERROR WHILE CLOSING DOWN: ', err.stack || err);
                }
            });

            process.exit(1);

        });

    }

};

module.exports = taskProcessUtil;