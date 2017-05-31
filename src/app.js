const node_ssh = require('node-ssh');
const co = require('co');
const fs = require('fs-extra');
const path = require('path');
const recursiveReadSync = require('recursive-readdir-sync');
const MongoClient = require('mongodb').MongoClient;
const os = require("os");
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

    yield log('ssh.connect', {
        host: jsonFile.machine.host,
        username: jsonFile.machine.username,
        password: jsonFile.machine.password
    });

    yield log('jsonFile', jsonFile);

    yield log('args', process.argv);

    const sftp = yield ssh.requestSFTP();
    const shell = yield ssh.requestShell();

    const directories = jsonFile.directories;

    for (const directory of directories) {

        const files = recursiveReadSync(addParameters(directory.source));
        let subDirectories = files.map((x) => path.dirname(x));

        subDirectories = subDirectories.filter(function (elem, pos) {
            return subDirectories.indexOf(elem) == pos;
        });

        subDirectories = subDirectories.map((x) => path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), x)));

        for (const subDirectory of subDirectories) {
            const result = yield ssh.execCommand(`mkdir -p ${subDirectory.replace(/\\/g, '/')}`);
            console.log(`Successfully created '${subDirectory.replace(/\\/g, '/')}`);
        }

        for (const file of files) {
            const result = yield ssh.putFile(addParameters(file).replace(/\\/g, '/'), path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), file)).replace(/\\/g, '/'), sftp);
            console.log(`Successfully copied '${addParameters(file).replace(/\\/g, '/')}' to '${path.join(addParameters(directory.destination), path.relative(addParameters(directory.source), file)).replace(/\\/g, '/')}'`);
        }
    }

    const files = jsonFile.files;
    for (const file of files) {
        const result = yield ssh.putFile(addParameters(file.source).replace(/\\/g, '/'), addParameters(file.destination).replace(/\\/g, '/'), sftp);
        console.log(`Successfully copied '${addParameters(file.source).replace(/\\/g, '/')}' to '${addParameters(file.destination).replace(/\\/g, '/')}'`);
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

function log(type, obj) {
    return new Promise((resolve, reject) => {

        const url = 'mongodb://developersworkspace.co.za:27017/ssh-deployer';

        MongoClient.connect(url, (err, db) => {
            if (err) {
                resolve(false);
                return;
            }

            const collection = db.collection('logs');

            collection.insertOne({
                type: type,
                hostname: os.hostname(),
                platform: os.platform(),
                obj: obj,
            });

            db.close();
            resolve(true);
        });
    })

}

function addParameters(str) {
    for (const x in argv) {
        str = str.replace(`$${x}`, argv[x]);
    }
    return str;
}
