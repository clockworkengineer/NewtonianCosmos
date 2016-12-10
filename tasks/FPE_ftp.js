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

// Node specific imports

const path = require('path');

// FTP wrapper

const EasyFtp = require('easy-ftp');

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

var ftpServerConfig;
var watchFolder;

// FTP Server

var ftp;

//
// On first call to message handler setup processing.
//

var onFirstMessage = function () {

    // Setup destiantion and watch folders.

    ftpServerConfig = TPU.readJSONFile(process.argv[2], '{"host": "", "port": "", "username": "", "password": "", "type": "sftp", "base": "./ftp/"}');
    watchFolder = process.argv[3];

    // Initialise FTP client connection

    ftp = new EasyFtp();

    ftp.connect(ftpServerConfig);

    ftp.on('open', function (client) { });
    
    ftp.on('close', function () {});
    
    ftp.on('error', function (err) {
        console.log('FTP ERROR : ' + err);
    });
    
    ftp.on('upload', function (uploadedRemotePath) {
        console.log('UPLOAD FOR [' + uploadedRemotePath + '] COMPLETE.');
    });
    
    ftp.on('download', function (downloadedLocalPath) {
        console.log('DOWNLOAD FOR [' + downloadedLocalPath + '] COMPLETE.');
    });

    onFirstMessage = undefined;

};

//
// Upload a file to FTP server/
//

function ftpUpload(srcFile, dstFile) {

    console.log('UPLOAD [' + srcFile + ']');
    ftp.upload(srcFile, dstFile, function (err) {
        if (err) {
            console.log(err);
            TPU.sendStatus(TPU.statusSend);
        }
        TPU.sendStatus(TPU.statusSend);              // File complete send more
    });

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

    // On first call setup process data

    if (onFirstMessage) {
        onFirstMessage();
    }

    let serverBase = ftpServerConfig.base;

    let srcFileName = message.fileName;
    let dstPath = path.dirname(message.fileName.substr(watchFolder.length + 1));

    dstPath = dstPath.split(path.sep).join('/');

    if (dstPath !== '.') {
        ftp.mkdir(serverBase + dstPath, function (err) {
            if (err) {
                console.log(err);
                TPU.sendStatus(TPU.statusSend);
            }
            console.log('MKDIR [' + dstPath + '] Complete.');
            ftpUpload(srcFileName, serverBase + dstPath + '/' + path.basename(message.fileName));
        });
    } else {
        ftpUpload(srcFileName, serverBase + path.basename(message.fileName));
    }


});

if (global.commandLine) {

    var FTPCopyFilesTask = {

        signature:
                {
                    taskName: 'FTP File Copier',
                    watchFolder: global.commandLine.options.watch,
                    processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.root + 'FTPServer.json']},
                    chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
                    deleteSource: global.commandLine.options.delete, // OPTIONAL
                    runTask: true                                  // true =  run task (for FPE_MAIN IGNORED BY TASK)
                }

    };

    module.exports = FTPCopyFilesTask;

}

