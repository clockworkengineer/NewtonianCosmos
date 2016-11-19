## File Processing Engine ##

# Introduction #

The file processing engine expands the concept of the data importer application into a generic folder watching application that processes any files and directories copied/moved into the watch folder. The core functionality is provided by the task object which when created will watch the designated watch folder for any files/directories copied in and send each file to a child process created with the passed in processDetails arguments. The core application has 4 task objects one is just a simple file copier, one sends files to Handbrake to be converted to an .mp4 video, one emails an enlosure of the file to HPs ePrinter servers to be printed and the last is another file copy variant but this copies based on the file extension to a specified destination.

# Task object #

A task object that is created to be a simple file copier is outlined below

   
    
    var task = require("./FPE_tasks.js");
    
    var tsk1 = new task(
    {
    	taskName : "File Copier",
    	watchFolder: "./watch",
    	processDetails: {prog: "node", args: ["./FPE_copyFiles.js", "./destination"]},
    });


The task name parameter is self explanatory along with the paths to the watch and destination folders (these will be created if they do not already exist). The task spawns a child process outlined by the processDetails parameter which in the case is node running a JavaScript file called "FPE_copyFiles.js". Any parameters that do occur after the JavaScript file name are passed directly through to the spawned process where it is its responsibility to deal with. 

Note  the watch folder is tagged on the end of the arguments for the process to use in whatever way it needs. Also the tables that contain the task details in "FPE_main.js" contain an extra field (runTask) to determine whether the task is to be run ( value will be passed through to the class constructor but will be ignored internally).

The task class has recently been made a child of the EventEmitter object so it inherits all its properties and functions.This is so all internal errors received can be sent via the 'error' event to be  picked up by a tasks external 'error'  event handler.

# Spawned Child Process #

The spawned child processes three main I/O channels stderr, stdout and stdout are piped so any output from stdout/stderr gets routed to the parent process child.st(out/err).on 'data' event handler where they just get sent to process.std(out/err).write. The child  process is also created with an 'ipc' event channel that is used by the parent to send the file names to be processed, for the child to receive and also for the child to send back a status to tell the parent what to do next.

The returned status can have one of two values '1' which means send me more files to process (ie. ready to receive) and '0' stop sending  files until they have finished being processed and then send back a '1'. This is very simplistic but stops the parent swamping the child process.

At present the design only really supports node based JavaScript child processes due to the 'ipc' message passing that is needed (I am unsure at present if these are supported in any other languages like C++). In any case the JavaScript can be just used as a wrapper for any under lying program.

The child process now also has all its stderr output sent to the parent tasks 'error' event handler via an emit.

# Imported Packages #

1. **chokidar**                - *A  wrapper around node.js fs.watch / fs.watchFile / fsevents.*
1. **fs-extra**				- *Enhanced base node file system.*
1. **handbrake-js**		    - *Wrapper for Handbrake video file conversion program*
1. **nodemailer**				- *SMTP protocol stack wrapper (create email clients)*

# TasksToRunDetails.json #

If this file is present in the engines working directory then it is read and used to drive the FPE session but if the file is not present or if its JSON is parsed with an error the default built in table is used.

# File Copy Task (FPE_copyfile.js)#

The file copy task is simply designed to be a child process that waits for events from the parent which contain the name of files to be copied; it uses a returned status message to tell the parent when to start and stop sending the names of files to be copied. It uses the fs-extra node package as the version of copy it provides will create any missing directories needed in the destination path unlike the default one provided by the node.js fs package.A special note should be made that the destination directory can be in the form "dest1, dest2, dest3..." which specifies that each file will be copied to all the specified destinations.

# Video File Conversion Task (FPE_handbrake.js) #

The video file conversion task takes any file names provided to it and as long as it conforms to a selected extension to convert ( passed in as parameter) pass it on to handbrake to be converted to .mp4 using its normal preset. To do this it uses the 'handbrake-js' package which spawns a child process to do the conversion. For more information about this package check out the [following](https://www.npmjs.com/package/handbrake-js#module_handbrake-js) link.

# HP ePrint Spooler Task (FPE_eprint.js)#

Having just bought a new printer (HP Deskjet) which has the facility of being able to email a print job to it I thought id write a ePrint mail spooler for it to enable me to use from my Linux boxes .I have a hate/hate relationship with Linux printing so this solution seemed ideal. The file which supports it follows that standard layout for a task process JavaScript file and it uses the package [nodemailer](https://www.npmjs.com/package/nodemailer) to provide the SMTP transport layer for the e mailer. Nodemailer is a powerful package but the functionality needed is basic but easy to implement; note all the details like STMP tranport, emailing source account details and printer email address are all taken from eprint.json.


# File Copy On Extension Task (FPE_copyfileOnExt.js)#

This task is very similar to the copyFile task but a file extension to destination folder mapping parameter is passed in so that any files with a and specified extension are routed to a given folder. If no mapping is found then the file is copied to the default destination. Note: Also at present it keeps any source file directory hieracy.

# To Do #

1. Make FPE more command line driven with relevant arguments and commands.
1. Group task files into separate directory and select easier.
1. Restructure task class so that private functions defined outside main constructor class.
1. Use Node.js Async package to handle file name queue better.
1. Use tasks written in other languages.