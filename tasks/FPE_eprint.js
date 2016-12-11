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

// Node path handling

const path = require('path');

// Nodemailer SMTP  processing package

const nodemailer = require('nodemailer');

// File systems extra package

const fs = require('fs-extra');

// Task Process Utils

const TPU = require('./FPE_taskProcessUtil.js');

//
// =========
// MAIN CODE
// =========
//

// Watch folder and allowed file formats to print

var fileFormats;
var watchFolder;

// eprint.json

var eprintDetails;

// SMTP transport 

var transporter;

//
// On first call to message handler setup processing.
//

var onFirstMessage = function () {

    // Setup watch folder and allowed file formats to print

    fileFormats = JSON.parse(process.argv[2]);
    watchFolder = process.argv[4];

    // Read in eprint.json

    eprintDetails = TPU.readJSONFile(process.argv[3], '"emailTransport" : "", "emailAccount" : "", "eprintAddress": "", "eprintSend": "true/false"}');

    // Create reusable transporter object using the default SMTP transport 

    transporter = nodemailer.createTransport('smtps://' + eprintDetails.emailTransport);

    onFirstMessage = undefined;

};

// 
// =====================
// MESSAGE EVENT HANDLER
// =====================
//

//
// Send email to HP ePrint with file attached so that it is printed.
//

process.on('message', function (message) {

    // On first call setup process data

    if (onFirstMessage) {
        onFirstMessage();
    }

    let srcFileName = message.fileName;

    // Send only selected extensions

    if (fileFormats[path.parse(srcFileName).ext]) {

        console.log('Emailing ' + srcFileName + ' to ePRINT.');

        // Set up email details

        let mailOptions = {
            from: eprintDetails.emailAccount,
            to: eprintDetails.eprintAddress,
            subject: srcFileName,
            attachments: [{path: srcFileName}]
        };

        // Send email if eprint.json send flag set to true

        if (eprintDetails.eprintSend && eprintDetails.eprintSend === 'true') {

            // send mail with defined transport object 

            transporter.sendMail(mailOptions, function (err, info) {
                TPU.sendStatus(TPU.stausSend);   // File complete send more
                if (err) {
                    return console.log(err);
                }
                console.log('Message sent: ' + info.response);
                if (message.deleteSource) {     // Delete Source if specified
                    TPU.deleteSourceFile(srcFileName);
                }
            });

        } else {
            console.log('Message not sent for file : ' + srcFileName);
            TPU.sendStatus(TPU.stausSend);  // File complete send more
        }

    } else {
        TPU.sendStatus(TPU.stausSend);  // File format not supported send another
    }

});



var Eprint = {

    signature: function () {
        return({
            taskName: 'File ePrinter',
            watchFolder: global.commandLine.options.watch,
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), '{ ".docx" : true, ".rtf" : true, ".txt" : true}', global.commandLine.options.root + 'eprint.json']},
            chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
            deleteSource: global.commandLine.options.delete, // OPTIONAL
            runTask: false                                  // true =  run task (for FPE_MAIN IGNORED BY TASK)
        });

    }

};

module.exports = Eprint;
