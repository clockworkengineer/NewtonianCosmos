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

    // Path module

    const path = require('path');

    // File systems extra package

    const fs = require('fs-extra');

    // Task Process Utils

    const TPU = require('./FPE_taskProcessUtil.js');

    // CSV processing and file watch modules.

    const CSV = require('comma-separated-values');

    // Currently SQLite/MySQL/JSON File are the only databases supported.

    const dbHandlers = require('./FPE_DataImporterHandlers.js').dbHandlers;

    //
    // =====================
    // MESSAGE EVENT HANDLER
    // =====================
    //

    //
    // Copy file to specified destination server/path
    //

    process.on('message', function (message) {

        let srcFileName = message.fileName;

        console.log('Importing File [%s] for conversion.', srcFileName);

        fs.readFile(srcFileName, 'utf8', function (err, data) {

            if (err) {
                console.error('Error Handling file: [%s]', srcFileName);
                console.error(err);
            } else {
                processFile(srcFileName, data);
                if (message.deleteSource) {                  // Delete Source if specified
                    TPU.deleteSourceFile(srcFileName);
                }

            }

        });

        TPU.sendStatus(TPU.statusSend);              // File complete send more

    });

    //
    // =========
    // MAIN CODE
    // =========
    //

    // Destinationwatch folders

    var destinationFolder = process.argv[2];
    var watchFolder = process.argv[3];

    // Customization processing. Indexed by file name.

    var customisations = [];

    customisations['Accupedo daily logs'] = {translator: accupedo, options: {header: ['year', 'month', 'day', 'steps', 'miles', 'calories', 'duration']}, handler: 'JSONFile', params: {destinationFolder: destinationFolder, databaseName: 'accupedo', tableName: 'walks'}};

    // The CSV created by accupedo has three numeric fields for the date so just convert
    // those to somthing sensible and copy the rest. Also the file doesn't contain a
    // header but chokidar will have added those for us with specifying header options above.

    function accupedo(record) {
        var newRecord = {};
        var dateOfExecersize = new Date(record.year, record.month - 1, record.day);
        newRecord['date'] = dateOfExecersize.toDateString();
        newRecord['steps'] = record.steps;
        newRecord['miles'] = record.miles;
        newRecord['calories'] = record.calories;
        newRecord['duration'] = record.duration;
        return(newRecord);
    }

    // Don't modify JSON

    function leaveit(record) {
        return(record);
    }

    // Process file.

    function processFile(fileName, data) {

        // Parse CSV file and produce JSON data. Pass in default
        // database and table nameto use if no customised translator
        // found.

        let custom;
        let dataJSON = [];
        let baseFileName = path.basename(fileName);

        if (!customisations[baseFileName]) {
            console.log('No customization exists for file [%s]', baseFileName);
            custom = {translator: leaveit, options: {header: true}, handler: 'JSONFile', params: {destinationFolder: destinationFolder, databaseName: 'default', tableName: path.parse(baseFileName).name}};
        } else {
            console.log('Using customization for file [%s]', baseFileName);
            custom = customisations[baseFileName];
        }

        CSV.forEach(data, custom.options, function (record) {
            dataJSON.push(custom.translator(record));
        });

        // Perform custom handler. ie write data to SQL database.

        if (dbHandlers[custom.handler]) {
            dbHandlers[custom.handler].Query(custom.params, dataJSON);
        } else {
            console.error('ERROR : No Database Query Handler Set.');
        }

    }

    // Process closedown

    function processCloseDown(callback) {

        try {

            console.log('Data Importer Closedown.');

            if (dbHandlers) {
                for (let db in dbHandlers) {
                    dbHandlers[db].Term();
                }
            }

        } catch (err) {
            callback(err);
        }

    }

    // Setup process exit handlers.

    TPU.processExitHandlers(processCloseDown);

    // Create desination folder if needed

    TPU.createFolder(destinationFolder);

    // Initialise all present databases.

    if (dbHandlers) {
        for (let db in dbHandlers) {
            dbHandlers[db].Init();
        }
    }

})(process.env.TASKCHILD);

// ======================
// TASK PROCESS SIGNATURE
// ======================

var DataImporterTask = {

    signature: function () {
        return({
            taskName: 'Data Importer',
            watchFolder: global.commandLine.options.watch,
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest]},
            chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
            deleteSource: global.commandLine.options.delete, // OPTIONAL
            runTask: false                                         // true =  run task (for FPE_MAIN IGNORED BY TASK)
        });

    }

};

module.exports = DataImporterTask;




