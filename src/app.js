const node_ssh = require('node-ssh');
const co = require('co');
const fs = require('fs-extra');
const path = require('path');
const recursiveReadSync = require('recursive-readdir-sync');
const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .alias('f', 'file')
    .describe('file', 'JSON Configuration File')
    .demandOption('file')
    .argv;

const jsonFile = fs.readJsonSync(argv.file);

co(function* () {

    const ssh = new node_ssh();

    yield ssh.connect({
        host: addParameters(jsonFile.machine.host),
        username: addParameters(jsonFile.machine.username),
        password: addParameters(jsonFile.machine.password)
    });

    const directories = jsonFile.directories;

    for (const directory of directories) {

        const files = recursiveReadSync(addParameters(directory.source));
        let subDirectories = files.map((x) => path.dirname(x));

        subDirectories = subDirectories.filter(function (elem, pos) {
            return subDirectories.indexOf(elem) == pos;
        });

        subDirectories = subDirectories.map((x) => path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), x)));

        for (const subDirectory of subDirectories) {
            const result = yield ssh.execCommand(`mkdir ${subDirectory.replace(/\\/g, '/')}`);
            console.log(`Successfully created '${subDirectory.replace(/\\/g, '/')}`);
        }

        for (const file of files) {
            const result = yield ssh.putFiles([{ local: addParameters(file), remote: path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), file)) }]);
            console.log(`Successfully copied '${addParameters(file)}' to '${path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), file))}'`);
        }
    }



    // for (const directory of directories) {
    //     const result = yield ssh.putDirectory(addParameters(directory.source), addParameters(directory.destination), {
    //         recursive: true,
    //         validate: function (itemPath) {
    //             return true;
    //         },
    //         tick: function (localPath, remotePath, error) {
    //             if (error) {
    //                 console.log(`Failed to copy '${localPath}' to '${remotePath}' -> ${error.message}`);
    //             } else {
    //                 console.log(`Successfully copied '${localPath}' to '${remotePath}'`);
    //             }
    //         }
    //     });
    // }

    const files = jsonFile.files;
    for (const file of files) {
        const result = yield ssh.putFiles([{ local: addParameters(file.source), remote: addParameters(file.destination) }]);
        console.log(`Successfully copied '${addParameters(file.source)}' to '${addParameters(file.destination)}'`);
    }

    const commands = jsonFile.commands;
    for (const command of commands) {
        const result = yield ssh.execCommand(addParameters(command));

        if (result.code !== 0) {
            console.log(result.stderr);
            console.log(`ERROR -> ${result.code}`);

            if (argv.exitOnError) {
                process.exit(result.code);
            }
        } else {
            console.log(result.stdout);
        }
    }

    ssh.dispose();
}).catch((err) => {
    console.log(err);
});

function addParameters(str) {
    for (const x in argv) {
        str = str.replace(`$${x}`, argv[x]);
    }
    return str;
}

// node app.js --machine 46.101.50.101 --username root --password MidericK96 --workspace "F:\Development\barend-erasmus\world-of-rations-service"

