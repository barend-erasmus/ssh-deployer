// Imports
import * as fs from 'fs-extra';
import * as winston from 'winston';
import * as yargs from 'yargs';
import { Copier } from './copier';
import { FileSystemGateway } from './file-system-gateway';
import { SSHGateway } from './ssh-gateway';

const argv = yargs
    .usage('Usage: $0 [options]')
    .alias('f', 'file')
    .describe('file', 'JSON Configuration File')
    .demandOption('file')
    .argv;

winston.debug(`Start`, argv);

const jsonFile = fs.readJsonSync(argv.file);

app().catch((err: Error) => {
    winston.error(err.message);
});

async function app() {

    const fileSystemGateway = new FileSystemGateway();

    const sshGateway = new SSHGateway(
        Copier.addParameters(jsonFile.machine.host, argv),
        Copier.addParameters(jsonFile.machine.username, argv),
        Copier.addParameters(jsonFile.machine.password, argv),
    );

    const copier = new Copier(jsonFile, fileSystemGateway, sshGateway, argv);

    await copier.copy();
}


