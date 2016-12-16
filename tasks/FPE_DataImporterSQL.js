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

// Path module

const path = require('path')

// File system module

const fs = require('fs');

// Task Process Utils

const TPU = require('./FPE_taskProcessUtil.js');

//  SQLite wrapper.

const sqlite3 = require('sqlite3');

// Cached SQLite connection indexed by file.

var connections = [];

SQLite = {

    // SQLite Initialisation.

    Init: function () {

        console.log("SQLite Inialised.");

    },

    // Insert data into a SQLite data base and given table.
    // If they to not exist then they are created. The table 
    // fields all being of type TEXT.

    Query: function (params, dataJSON) {

        var databaseFileName = path.join(params.databaseFolder, params.databaseName + ".db");

        if (!fs.existsSync(databaseFileName)) {
            console.log("Creating DB file.");
            fs.closeSync(fs.openSync(databaseFileName, "w"));
        }

        // Setup column names for create table and also placeholder string for 
        // insert query (i.e "? ? ?...").

        colNames = [];
        colPlaceHolder = [];
        for (var key in dataJSON[0]) {
            if (dataJSON[0].hasOwnProperty(key)) {
                colNames.push(key + " TEXT");
                colPlaceHolder.push("?");
            }
        }

        // To prevent SQlite busy errors save  and reuse the same connection to a database.
        // This is safe but leaves unclosed connection around until the program is closed.

        if (!connections[params.databaseName]) {

            connections[params.databaseName] = new sqlite3.Database(databaseFileName, function (err) {
                if (err) {
                    console.error(err);
                }
                console.log("Create new connection for " + databaseFileName);
            });
        } else {
            console.log("Use existing connection for " + databaseFileName);
        }

        db = connections[params.databaseName];

        db.serialize(function () {

            // Create table if doesnt exist.

            query = "CREATE TABLE IF NOT EXISTS '" + params.tableName + "' (" + colNames.join(",") + ");";
            db.run(query, function (err) {
                if (err) {
                    console.error(err);
                }
            });

            // Insert records.

            var stmt = db.prepare("INSERT INTO '" + params.tableName + "' VALUES (" + colPlaceHolder.join(",") + ")");

            for (var row in dataJSON) {

                colValues = [];

                for (var vals in dataJSON[row]) {

                    if (dataJSON[row].hasOwnProperty(vals)) {
                        colValues.push("'" + dataJSON[row][vals] + "'");

                    }
                }
                stmt.run(colValues, function (err) {
                    if (err) {
                        console.error(err);
                    }

                });

            }

            stmt.finalize();

        });


    },

    // SQLite Termination.

    Term: function () {

        for (var conn in connections) {
            console.log("Closing connection to " + conn);
            connections[conn].close();
        }

        connections = [];

        console.log("SQLite Termination.");

    }

};

// MySQL wrapper

const mysql = require('mysql');

// MySQL connection pool 

var pool;

var MySQL = {

    // MySQL initialisation code

    Init: function () {

        // Create a pool to handle SQL queries. Note SQL server, user and password
        // etc need to be read from a login.json in the same directory as the app.

        loginDetails = TPU.readJSONFile('./tasks/MySQL.json', '{ "dbServer" : "", "dbUserName" : "", "dbPassword" : "", "databaseName" : "" }');

        try {
            
            pool = mysql.createPool({
                connectionLimit: 100, //important
                host: loginDetails.dbServer,
                user: loginDetails.dbUserName,
                password: loginDetails.dbPassword,
                database: loginDetails.databaseName,
                debug: false
            });

        } catch (err) {
            console.error(err);
            process.exit(1);

        }
        console.log("MySQL Inialised.");

    },

    Query: function (params, dataJSON) {

        // Grab a pool connection
        
        pool.getConnection(function (err, connection) {

            // Write any error message and return.

            if (err) {
                console.error(err);
                process.exit(1);
            }

            // Ready for queries.

            console.log('connected as SQL Server id ' + connection.threadId);

            // Setup column names for create table and also placeholder string for 
            // insert query (i.e "? ? ?...").

            colNames = [];
            colPlaceHolder = [];
            for (var key in dataJSON[0]) {
                if (dataJSON[0].hasOwnProperty(key)) {
                    colNames.push(key + " VARCHAR(255)");
                    colPlaceHolder.push("?");
                }
            }

            // Create table

            query = "CREATE TABLE IF NOT EXISTS " + params.tableName + " (" + colNames.join(",") + ");";

            connection.query(query, function (err, rows) {
                if (err) {
                    console.error(err);
                }
            });

            // Insert records.

            query = "INSERT INTO " + params.tableName + " VALUES (" + colPlaceHolder.join(",") + ")";

            for (var row in dataJSON) {

                colValues = [];

                for (var vals in dataJSON[row]) {

                    if (dataJSON[row].hasOwnProperty(vals)) {
                        colValues.push("'" + dataJSON[row][vals] + "'");

                    }
                }

                // Perform INSERT for record.

                connection.query(query, colValues, function (err, rows) {
                    if (err) {
                        console.error(err);
                    }
                });

            }

            // Release pooled conenction.

            console.log("Server connection release.");
            connection.release();

        });

    },

    // MySQL termination.

    Term: function () {

        if (pool) {
            pool.end(function (err) {
                if (err) {
                    console.error(err);
                }
            });
        }
        console.log("MySQL Termination.");

    }

};
var dbHandlers = [];

dbHandlers["SQLite"] = SQLite;
dbHandlers["MySQL"] = MySQL;

module.exports = {dbHandlers};
