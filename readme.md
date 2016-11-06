## File Processing Engine ##

# Introduction #

The file processing engine expands the concept of the data importer application into a generic folder watching application that processes any files and directories copied/moved into the watch folder. The core functionality is provided by the task object which when created will watch the designated watch folder for any files/directories copied in and send each file to the child process created with the passed in processDetails arguments. The core application creates 2 task objects one is just a simple file copier and the other to send files to Handbrake to be converted to an .mp4 video.

# Task object #

A task object that is created to be a simply file copier is outlined below

   
    
    var tasks = require("./FPE_tasks.js");
    
    var tsk1 = new tasks.task(
    {
    	taskName : "File Copier",
    	watchFolder: "./watch",
    	destinationFolder: "./destination",
    	processDetails: {prog: "node", args: ["./FPE_copyFiles.js"]}
    });


The task name parameter is self explanatory along with the paths to the watch and destination folders (these will be created if they do not already exist). The task spawns a child process outlined by the processDetails parameter which in the case is node running a JavaScript file called "FPE_copyFiles.js". Any parameters that do occur after the JavaScript file name are passed directly through to the spawned process where it is its responsibility to deal with. Note also the watch and destination folders are tagged on the end for the process to use in whatever way it needs.

# Spawned Child Process #

The spawned child processes three main I/O channels stderr, stdout and stdout are piped so any output from stdout/stderr gets routed to the parent process child.st(out/err).on 'data' event handler where they just get sent to process.std(out/err).write. The child  process is also created with an 'ipc' event channel that is used by the parent to send the file names to be processed and for the child to receive and also for the child to send back a status to tell the parent what to do next.

The returned status can have one of two values '1' which means send me more files to process (ie. ready to receive) and '0' stop sending  files until they have finished being processed and then send back a '1'. This is very simplistic but stops the parent swamping the child process.

At present the design only really supports node based JavaScript child processes due to the 'ipc' message passing that is needed (I am unsure at present if these are supported in any other languages like C++). In any case the JavaScript can be just used as a wrapper for any under lying program.

# Imported Packages #

1. **chokidar**                - *A  wrapper around node.js fs.watch / fs.watchFile / fsevents.*
1. **fs-extra**				- *Enhanced base node file system.*
1. **handbrake-js**		    - *Wrapper for Handbrake video file conversion program*
1. **nodemailer**				- *SMTP protocol stack wrapper (create email clients)*


# File Copy Task #

The file copy task is simply designed to be a child process that waits for events from the parent which contain the name of files to be copied; it uses a returned status message to tell the parent when to start and stop sending the names of files to be copied. It uses the fs-extra node package as the version of copy it provides will create any missing directories needed in the destination path unlike the default one provided by the node.js fs package. Also a special note should be made that the destination directory can be in the form "dest1, dest2, dest3..." which specifies that each file will be copied to all the specified destinations.

# Video File Conversion #

The video file conversion task takes any file names provided to it and as long as it conforms to a selected extension to convert ( passed in as parameter) and pass it to handbrake to be converted to .mp4 using the normal preset. To do this it uses the 'handbrake-js' package which spawns a child process to do the conversion. For more information about this package check out the [following](https://www.npmjs.com/package/handbrake-js#module_handbrake-js) link.


