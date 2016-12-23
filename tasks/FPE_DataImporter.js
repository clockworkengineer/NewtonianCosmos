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
    // ================
    // UNPACK ARGUMENTS
    // ================
    //

    // Destination / watch folders, data importer options JSON file

    var destinationFolder = process.argv[2];
    var watchFolder = process.argv[4];
    var dataImporterJSON =  process.argv[3];
    
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
                TPU.sendStatus(TPU.statusSend);              // Error but stillsend more
            } else {
                processFile(srcFileName, data);
                if (message.deleteSource) {                  // Delete Source if specified
                    TPU.deleteSourceFile(srcFileName);
                }
            }

        });

    });

    //
    // =========
    // MAIN CODE
    // =========
    //

    // CSV custom processing. Last entry matches any file name and is the default.

    var customisations = [

        {matcher: /Accupedo daily logs.*/i,
            translator: accupedo,
            options: {header: ['year', 'month', 'day', 'steps', 'miles', 'calories', 'duration']},
            handler: 'JSONFile',
            params: {destinationFolder: destinationFolder, databaseName: 'accupedo', tableName: 'walks'}},

        {matcher: /.*/i,
            translator: leaveit,
            options: {header: true},
            handler: 'JSONFile',
            params: {destinationFolder: destinationFolder, databaseName: 'default'}}

    ];
   
    // The CSV created by accupedo has three numeric fields for the date so just convert
    // those to somthing sensible and copy the rest. Also the file doesn't contain a
    // header but chokidar will have added those for us with specifying header options above.

    function accupedo(record) {
        let newRecord = {};
        let dateOfExecersize = new Date(record.year, record.month - 1, record.day);
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

        // Parse CSV file and produce JSON data.

        let custom;
        let dataJSON = [];
        let baseFileName = path.basename(fileName);

        // Check whether file matches a customisation regex. The last entry is
        // a catch all match anything (ie. default).
        
        for (let cust in customisations) {
            if (customisations[cust].matcher.test(baseFileName)) {
                custom = customisations[cust];
                break;
            }
        }

        // Default has no table name so use filename.

        if (custom.params.databaseName==='default') {
            custom.params.tableName = path.parse(baseFileName).name;
        }
        
        // Convert each line of CSV to JSON
        
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

    // Create destination folder if needed

    TPU.createFolder(destinationFolder);
    
    // Read in data importer handler options

    let dbHandlerOptions = TPU.readJSONFile(dataImporterJSON, 
    '{"MySQL" : { "dbServer" : "", "dbUserName" : "", "dbPassword" : "", "databaseName" : "" } , "SQLite": {}, "JSONFile":{} }');

    // Initialise all present databases.

    if (dbHandlers) {
        for (let db in dbHandlers) {
            dbHandlers[db].Init(dbHandlerOptions[db]);
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
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest, global.commandLine.options.root + 'DataImporter.json']},
        });

    }

};

module.exports = DataImporterTask;




