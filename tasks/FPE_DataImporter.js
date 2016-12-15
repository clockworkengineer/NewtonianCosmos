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

    // File systems extra package

    const fs = require('fs-extra');

    // Task Process Utils

    const TPU = require('./FPE_taskProcessUtil.js');

    // CSV processing and file watch modules.

    const CSV = require("comma-separated-values");

   // Currently SQLite/MySQL are the only databases supported.

    //var db = require("./FPE_DataImporterSQL.js").MySQL;
    var db = require("./FPE_DataImporterSQL.js").SQLite
   
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

        console.log("Importing File [%s] for conversion.", srcFileName);

        fs.readFile(srcFileName, "utf8", function (err, data) {

            if (err) {
                console.error("Error Handling file: " + srcFileName);
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

   // Desination/database/watch folders

    var destinationFolder = process.argv[2];
    var databaseFolder = process.argv[3];
    var watchFolder = process.argv[4];
  
    // Customization processing. Indexed by file name.

    var customisations = [];

    customisations["Accupedo daily logs"] = {translator: accupedo, options: {header: ["year", "month", "day", "steps", "miles", "calories", "duration"]}, handler: db.Query, params: {databaseFolder: databaseFolder, databaseName: "accupedo", tableName: "walks"}};

    // The CSV created by accupedo has three numeric fields for the date so just convert
    // those to somthing sensible and copy the rest. Also the file doesn"t contain a
    // header but chokidar will have added those for us with specifying header options above.

    function accupedo(record) {
        var newRecord = {};
        var dateOfExecersize = new Date(record.year, record.month - 1, record.day);
        newRecord["date"] = dateOfExecersize.toDateString();
        newRecord["steps"] = record.steps;
        newRecord["miles"] = record.miles;
        newRecord["calories"] = record.calories;
        newRecord["duration"] = record.duration;
        return(newRecord);
    }

    // Don't modify JSON

    function leaveit(record) {
        return(record);
    }

    // No customsation then use default otherwise return selected customsation.

    function customisation(filename, params) {

        if (!customisations[filename]) {
            return({translator: leaveit, options: {header: true}, handler: db.Query, params: params});
        }
        return(customisations[filename]);
    }
    ;

    // Process file.

    function processFile(fileName, data) {

        // Parse CSV file and produce JSON data. Pass in default
        // database and table nameto use if no customised translator
        // found.

        var dataJSON = [];

        var custom = customisation(path.basename(fileName), {databaseFolder: databaseFolder, databaseName: "default", tableName: path.parse(fileName).name});

        CSV.forEach(data, custom.options, function (record) {
            dataJSON.push(custom.translator(record));
        });

        // Write JSON to destination file and delete source.

        fs.writeFile(destinationFolder + "\\" + path.parse(fileName).name + ".json", JSON.stringify(dataJSON), function (err) {
            if (err) {
                console.error(err);
            } else {
                console.log("JSON saved to " + path.parse(fileName).name + ".json");
            }
        });

        // Perform custom handler. ie write data to SQL database.

        custom.handler(custom.params, dataJSON);

    }

    // Process closedown

    function processCloseDown(callback) {

        try {
            console.log("Data Importer Closedown.");
        } catch (err) {
            callback(err);
        }

    }

    // Setup process exit handlers.

    TPU.processExitHandlers(processCloseDown);

    // Create desination and database folder if needed

    TPU.createFolder(destinationFolder);
    TPU.createFolder(databaseFolder);

})(process.env.TASKCHILD);

// ======================
// TASK PROCESS SIGNATURE
// ======================

var DataImporterTask = {

    signature: function () {
        return({
            taskName: 'Data Importer',
            watchFolder: global.commandLine.options.watch,
            processDetails: {prog: 'node', args: [__filename.slice(__dirname.length + 1), global.commandLine.options.dest, "databases"]},
            chokidarOptions: global.commandLine.options.chokidar, // OPTIONAL
            deleteSource: global.commandLine.options.delete, // OPTIONAL
            runTask: false                                         // true =  run task (for FPE_MAIN IGNORED BY TASK)
        });

    }

};

module.exports = DataImporterTask;




