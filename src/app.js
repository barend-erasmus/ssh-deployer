const node_ssh = require('node-ssh');
const co = require('co');
const fs = require('fs-extra');
const path = require('path');
const winston = require('winston')
const recursiveReadSync = require('recursive-readdir-sync');
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .alias('f', 'file')
    .describe('file', 'JSON Configuration File')
    .demandOption('file')
    .argv;

winston.add(winston.transports.File, { filename: 'ssh-deployer.log', level: 'debug' });
winston.debug(`Start`, argv);

const jsonFile = fs.readJsonSync(argv.file);

co(function* () {

    const ssh = new node_ssh();

    yield ssh.connect({
        host: addParameters(jsonFile.machine.host),
        username: addParameters(jsonFile.machine.username),
        password: addParameters(jsonFile.machine.password)
    });

    const sftp = yield ssh.requestSFTP();
    const shell = yield ssh.requestShell();

    const directories = jsonFile.directories;

    for (const directory of directories) {

        // Adds parameters to directory source and destination
        const parsedDirectorySource = addParameters(directory.source);
        const parsedDirectoryDestination = addParameters(directory.destination);
        
        // Builds list of files in source directory and map to relative path
        const files = recursiveReadSync(parsedDirectorySource).map((x) => path.relative(parsedDirectorySource, x));
        
        // Builds list of sub directories in source directory
        let subDirectories = files.map((x) => path.dirname(x));
        subDirectories = subDirectories.filter((elem, pos) => {
            return subDirectories.indexOf(elem) == pos;
        });

        // Creates sub directories on destination
        for (const subDirectory of subDirectories) {
            const parsedSubDirectory = toLinuxPath(path.join(parsedDirectoryDestination, subDirectory));

            const result = yield ssh.execCommand(`mkdir -p ${parsedSubDirectory}`);
            winston.info(`Successfully created '${parsedSubDirectory}`);
        }

        // Copies files from source to destination
        for (const file of files) {
            const parsedSourceFile = toLinuxPath(path.join(parsedDirectorySource, addParameters(file)));
            const parsedDestinationFile = toLinuxPath(path.join(parsedDirectoryDestination, path.relative(parsedDirectorySource, file)));

            winston.info(`Queuing '${parsedSourceFile}' to '${parsedDestinationFile}'`);
            const result = yield ssh.putFile(parsedSourceFile, parsedDestinationFile, sftp);
            winston.info(`Successfully copied '${parsedSourceFile}' to '${parsedDestinationFile}'`);
        }
    }

    // Copies files from source to destination
    const files = jsonFile.files;
    for (const file of files) {
        const parsedSourceFile = toLinuxPath(addParameters(file.source));
        const parsedDestinationFile = toLinuxPath(addParameters(file.destination));

        winston.info(`Queuing '${parsedSourceFile}' to '${parsedDestinationFile}'`);
        const result = yield ssh.putFile(parsedSourceFile, parsedDestinationFile, sftp);
        winston.info(`Successfully copied '${parsedSourceFile}' to '${parsedDestinationFile}'`);
    }


    // Execute commands
    const commands = jsonFile.commands;
    for (const command of commands) {
        const result = yield ssh.execCommand(addParameters(command));

        if (result.code !== 0) {
            winston.error(result.stderr, result);
            winston.error(`ERROR -> ${result.code}`);

            if (argv.exitOnError) {
                process.exit(result.code);
            }
        } else {
            winston.info(result.stdout);
        }
    }

    ssh.dispose();
}).catch((err) => {
    winston.error(err.message, err);
});

function toLinuxPath(str) {
    return str.replace(/\\/g, '/');
}

function addParameters(str) {
    for (const x in argv) {
        str = str.replace(`$${x}`, argv[x]);
    }
    return str;
}
