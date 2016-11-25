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

// Node path handling

var path = require('path');

// Nodemailer SMTP  processing package

var nodemailer = require('nodemailer');

// File systems extra package

var fs = require('fs-extra');

// Task Process Utils

var TPU = require('./FPE_taskProcessUtil.js');

//
// =========
// MAIN CODE
// =========
//

// Setup watch folder and allowed file formats to print

var fileFormats = JSON.parse(process.argv[2]);
var watchFolder = process.argv[3];

// Read in eprint.json

var eprintDetails = TPU.readJSONFile('eprint.json', '"emailTransport" : "", "emailAccount" : "", "eprintAddress": "", "eprintSend": "true/false"}');

// Create reusable transporter object using the default SMTP transport 

var transporter = nodemailer.createTransport('smtps://' + eprintDetails.emailTransport);

// 
// =====================
// MESSAGE EVENT HANDLER
// =====================
//

//
// Send email to HP ePrint with file attached so that it is printed.
//

process.on('message', function (message) {

    let srcFileName = message.fileName;

    // Send only selected extensions

    if (fileFormats[path.parse(srcFileName).ext]) {

        TPU.sendStatus(TPU.stausWait);  // Signal file being processed so stop sending more.

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