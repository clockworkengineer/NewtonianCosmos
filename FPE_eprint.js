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

// Setup watch folder  and allowed file formats to convert

var fileFormats = JSON.parse(process.argv[2]);
var watchFolder = process.argv[3];

// ePrint Details

var eprintDetails;

// Read in eprint.json

try {

    var eprintDetails = JSON.parse(fs.readFileSync('./eprint.json', 'utf8'));

} catch (err) {

    if (err.code === 'ENOENT') {
        console.log('eprint.json not found.');
        console.log('Contents should be: { "emailTransport" : "", "emailAccount" : "", "eprintAddress": "", "eprintSend": "true/false"}');
    } else {
        console.error(err);
    }

    // Do not go any further in handling file

    process.exit(1);

};

// Send satus reply to parent (1=rdy to recieve files, 0=proessing don't send)

function processSendStatus(value) {

    process.send({status: value}, function (err) {  // Signal file being processed so stop sending more.
        if (err) {
            console.error(err);
        }
    });

};

// Create reusable transporter object using the default SMTP transport 

var transporter = nodemailer.createTransport('smtps://' + eprintDetails.emailTransport);

// Send email to HP ePrint with file attached so that it is printed.

process.on('message', function (message) {

    var srcFileName = message.fileName;

    // Send only selected extensions

    if (fileFormats[path.parse(srcFileName).ext]) {

        processSendStatus(0);  // Signal file being processed so stop sending more.

        console.log('Emailing ' + srcFileName + ' to ePRINT.');

        // Set up email details

        var mailOptions = {
            from: eprintDetails.emailAccount,
            to: eprintDetails.eprintAddress,
            subject: srcFileName,
            attachments: [{path: srcFileName}]
        };

        // Send email if eprint.json send flag set to true

        if (eprintDetails.eprintSend && eprintDetails.eprintSend === 'true') {

            // send mail with defined transport object 

            transporter.sendMail(mailOptions, function (err, info) {
                processSendStatus(1);   // File complete send more
                if (err) {
                    return console.log(err);
                }
                console.log('Message sent: ' + info.response);
            });

        } else {
            console.log('Message not sent for file : ' + srcFileName);
            processSendStatus(1);  // File complete send more
        }

    } else {
        processSendStatus(1);  // File format not supported send another
    }

});   