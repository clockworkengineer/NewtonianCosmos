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

    // Node specific imports

    const path = require('path');

    // FTP wrapper

    var EasyFtp = require('easy-ftp');

    // File systems extra package

    const fs = require('fs-extra');

    // Task Process Utils

    const TPU = require('./FPE_taskProcessUtil.js');

    //
    // ================
    // UNPACK ARGUMENTS
    // ================
    //
  
    // Watch and ftpServer JSON FIle.

    var watchFolder = process.argv[3];
    var ftpServerJSON = process.argv[2];

    //
    // =====================
    // MESSAGE EVENT HANDLER
    // =====================
    //

    //
    // Upload a file to FTP server.
    //

    function ftpUpload(srcFile, dstFile, deleteSource) {

        console.log('UPLOADING [%s].', srcFile);
        ftp.upload(srcFile, dstFile, function (err) {
            if (err) {
                console.error(err);
                TPU.sendStatus(TPU.statusSend);          // Error but still try to send more
            }
            if (deleteSource) {     // Delete Source if specified
                 TPU.deleteSourceFile(srcFile);
            }

            TPU.sendStatus(TPU.statusSend);              // File complete send more
        });

    }

    //
    // Copy file to specified destination server/path
    //

    process.on('message', function (message) {

        let srcFileName = message.fileName;
        let dstPath = path.dirname(message.fileName.substr(watchFolder.length + 1));

        dstPath = dstPath.split(path.sep).join('/');

        if (dstPath !== '.') {

            ftp.exist(dstPath, function (doesExist) {

                if (!doesExist) {
                    console.log('MKDIR [%s] startded.', dstPath);
                    ftp.mkdir(dstPath, function (err) {
                        if (err) {
                            console.error(err);
                            TPU.sendStatus(TPU.statusSend);
                        }
                        console.log('MKDIR [%s] complete.', dstPath);
                        ftpUpload(srcFileName, dstPath + '/' + path.basename(message.fileName), message.deleteSource);
                    });
                } else {
                    console.log('[%s] exists.', dstPath);
                    ftpUpload(srcFileName, dstPath + '/' + path.basename(message.fileName),message.deleteSource);
                }
            });

        } else {
            ftpUpload(srcFileName, path.basename(message.fileName), message.deleteSource);
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
            if (ftp) {
                ftp.close();
            }
        } catch (err) {
            callback(err);
        }

    }
    
    // Setup process exit handlers.

    TPU.processExitHandlers(processCloseDown);

    // Read in FTP Server details

    var ftpServerConfig = TPU.readJSONFile(ftpServerJSON, '{"host": "", "port": "", "username": "", "password": "", "type": "sftp/ftp"}');

    // Initialise FTP client connection
    
    var ftp;

    try {
        ftp = new EasyFtp();
        ftp.connect(ftpServerConfig);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }

    // FTP client event handlers

    ftp.on('error', function (err) {
        console.error('FTP ERROR : %s', err);
        process.exit(1);
    });

    ftp.on('upload', function (uploadedRemotePath) {
        console.log('UPLOAD FOR [%s] COMPLETE.', uploadedRemotePath);
    });

    ftp.on('download', function (downloadedLocalPath) {
        console.log('DOWNLOAD FOR [%s] COMPLETE.', downloadedLocalPath);
    });

})(process.env.TASKCHILD);

// ======================
// TASK PROCESS SIGNATURE
// ======================

var FTPCopyFilesTask = {

    signature: function () {
        return({
            taskName: 'FTP File Copier',
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.root + 'FTPServer.json']},
         });

    }

};

module.exports = FTPCopyFilesTask;


