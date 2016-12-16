## File Processing Engine ##

# Introduction #

The file processing engine expands the concept of the data importer application into a generic folder watching application that processes any files and directories copied/moved into the watch folder. The core functionality is provided by the task object which when created will watch the designated watch folder for any files/directories copied in and send each file to a child process created with the passed in processDetails arguments. The core application has 5 task objects

1.  a simple file copier.
1.  a video file converter thats uses HandBrake to convert files to .mp4.
1.  a printer spooler that emails all files to HPs ePrinter servers to be printed.
1.  a file copy variant that copies based on the file extension to a specified destination.
1.  a FTP client that acts like the simple file copier but the destination is an FTP server.

# Task object #

A task object that is created to be a simple file copier is outlined below

   
    
    var task = require("./FPE_tasks.js");
    
    var tsk = new task(
    {
    	taskName : "File Copier",
    	watchFolder: "./watch",
    	processDetails: {prog: "node", args: ["./FPE_copyFiles.js", "./destination"]},
		chokidarOptions: { ignored: /[\/\\]\./, ignoreInitial: true, persistent: true}, // OPTIONAL
        deleteSource : true   // OPTIONAL
    });

**taskName** - Description of what the task does.

**watchFolder** - Directory/Folder which is watched for files being created moved into (this will be created if it does not already exist). 

**processDetails** - Details of child process to be spawned to process any files.In the case above it is node running a JavaScript file called "FPE_copyFiles.js". Any parameters that do occur after the JavaScript file name are passed directly through to the spawned process where it is its responsibility to deal with. 

**chokidarOptions** - This parameter is optional and is passed directly to the chokidar watch constructor but a default is used if it  is not provided. 

**deleteSource**  - This is optional and if present indicates whether the child process should delete the source file after its finished being processed.

Note  the watch folder is tagged on to the end of the arguments for the process to use in whatever way it needs. All tables that contain task also have an extra property (runTask) to determine whether the task is to be run ( value will be passed through to the class constructor but will be ignored internally).

The task class has recently been made a child of the EventEmitter object so it inherits all its properties and functions.This is so all internal errors received can be sent via the 'error' event to be  picked up by a tasks external 'error'  event handler.

Given the asynchronous single threaded nature of Node then communication with the child process is simple. Files are added to a queue and if variable _status is set to 1 send the file direct to the child process and set _status to 0 to signal that further files should be queued until the queue has been cleared by the child (_status is set back to 1 when it empties the queue). All this means is that while the child process is dealing with one file more can be added to the queue in the task and also that the watcher will not flood the child process with files to process.

# Spawned Child Process #

The spawned child processes three main I/O channels stderr, stdout and stdout are piped so any output from stdout/stderr gets routed to the parent process child.st(out/err).on 'data' event handler where stdout gets routed to console.log and stderr gets emmited as an 'error' event.The child  process is also created with an 'ipc' event channel that is used by the parent to send the file names to be processed, for the child to receive and also for the child to send back a status to tell the parent what to do next.

At present the design only really supports node based JavaScript child processes due to the 'ipc' message passing that is needed (I am unsure at present if these are supported in any other languages like C++). In any case the JavaScript can be just used as a wrapper for any under lying program.

Each task file now consists of two parts. The first part that contains the signature (bacically all the details used to create the task) which is exported and read by the main program and the second contains an function called TASKPROCESS that is run if the file is loaded child process. Note that this is indicated by the Task object defining process.env.TASKCHILD to be part of the spawned processes environment. Having a module of this format keeps all  that is required to run a task in one place.


# Imported Packages #

1. **chokidar**                - *A  wrapper around node.js fs.watch / fs.watchFile / fsevents.*
1. **fs-extra**				- *Enhanced base node file system.*
1. **handbrake-js**		    - *Wrapper for Handbrake video file conversion program*
1. **nodemailer**				- *SMTP protocol stack wrapper (create email clients)*
2. **command-line-args**	- *A library to parse command-line options.*
3. **easy-ftp**				- *FTP client implementation*

# Command line #

The FPE is driven from its command line and entering the command **node FPE_main.js --help** will bring up a list of its commands.

    File Processing Engine
    
    CommandDesciption
    
    --taskfile(-t) arg		Task file JSON file to run with.
    --watch(-w) arg   		Watch folder.
    --dest(-d) arg			Desination folder.
    --name(-n) arg			Program desciption.
    --dump(-u) arg			Dump built-in tasks to JSON file
    --delete(-e) arg  		Delete source file.
    --run(-r) arg 			Run task number.
    --chokidar(-c) arg		Chokidar options.
    --list(-i)				List tasks built-in.
    --root(-o)				Folder containing tasks.
    --logfile(-l) arg 		Log file name.
    --help(-h)				Help menu.
    
    

**taskfile** - Used to specify the task file used to drive th FPE. If no file is given then it defaults to 'tasksToRunDetails.json'. The JSON for this file is the same format for the built-in table including the runTask flag.

**watch** - Watch folder name for when driving FPE from command line. This defaults to 'watch'.

**dest**  - Destination folder name for when driving FPE from command line. This defaults to 'destination'.

**name** - Change program name from 'File Processing Engine' for display purposes (still finding a use for this and it may by removed).

**dump** - Dump all the built-in module sigatures to the specified JSON file.

**delete** - After a file has been successfully been processed it is deleted.

**run** - Run the specified built in task. Use --list to find the built-in tasks.

**root** - Folder containing all of the built-in task script commands (default : ./tasks).

**chokidar** - File watch package chokidar options.

**list** - List buit-in with ther numeric id to use with run.

**logfile** - Specify a log file to record output (note at present this still goes to console too).

**help**  - Display command list.

    
# TasksToRunDetails.json #

If this file is present in the engines working directory and no other sources are specified via the command line then it is read and used to drive the FPE session.

# File Copy Task (FPE_copyfile.js)#

The file copy task is simply designed to be a child process that waits for events from the parent which contain the name of files to be copied; it uses a returned status message to tell the parent when to start and stop sending the names of files to be copied. It uses the fs-extra node package as the version of copy it provides will create any missing directories needed in the destination path unlike the default one provided by the node.js fs package.A special note should be made that the destination directory can be in the form "dest1, dest2, dest3..." which specifies that each file will be copied to all the specified destinations.

# Video File Conversion Task (FPE_handbrake.js) #

The video file conversion task takes any file names provided to it and as long as it conforms to a selected extension to convert ( passed in as parameter) pass it on to handbrake to be converted to .mp4 using its normal preset. To do this it uses the 'handbrake-js' package which spawns a child process to do the conversion. For more information about this package check out the [following](https://www.npmjs.com/package/handbrake-js#module_handbrake-js) link.

# HP ePrint Spooler Task (FPE_eprint.js)#

Having just bought a new printer (HP Deskjet) which has the facility of being able to email a print job to it I thought id write a ePrint mail spooler for it to enable me to use the printer  from my Linux boxes .I have a hate/hate relationship with Linux printing so this solution seemed ideal. The file which supports it follows that standard layout for a task process JavaScript file and it uses the package [nodemailer](https://www.npmjs.com/package/nodemailer) to provide the SMTP transport layer for the e mailer. Nodemailer is a powerful package but the functionality needed is basic and  easy to implement; note all the details like STMP tranport, emailing source account details and printer email address are all taken from **eprint.json**.


# File Copy On Extension Task (FPE_copyfileOnExt.js)#

This task is very similar to the copyFile task but a file extension to destination folder mapping parameter is passed in so that any files with a and specified extension are routed to a given destination folder. If no mapping is found then the file is copied to the default destination. Note: At present it keeps any source file directory hieracy.

# FTP File Copier (FPE_ftp.js) #

This another variant of the simple file copy program except that all files are copied to a remote ftp server (the source folder hierarchy is recreated). The current implementation uses node package ['easy-ftp'](https://github.com/humy2833/easy-ftp) though this may change in the future as there are alot of alternatives. Note: All ftp server details are taken from file 'FTPServer.json' that should reside in the tasks folder and have the following format.

{"host": "", "port": "", "username": "","password": "","type": "ftp/sftp" }

which is basically the options parameter that easy-ftp uses to create a connection.


# To Do #

1. Use tasks written in other languages.
3. Auto generate destination from extension ie. .txt to "txt" folder.

