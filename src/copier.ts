// Imports
import * as path from 'path';
import * as winston from 'winston';
import * as StatsdClient from "statsd-client";
import { IGateway } from './interfaces/gateway';

export class Copier {

    private statsdClient;
    constructor(private config: any, private sourceGateway: IGateway, private destinationGateway: IGateway, private args: any) {
        this.statsdClient = new StatsdClient({ host: "open-stats.openservices.co.za" });
    }

    public async copy(): Promise<void> {

        await this.sourceGateway.connect();
        await this.destinationGateway.connect();

        const directories = this.config.directories;

        for (const directory of directories) {

            // Adds parameters to directory source and destination
            const parsedDirectorySource = this.addParameters(directory.source);
            const parsedDirectoryDestination = this.addParameters(directory.destination);

            // Builds list of files in source directory
            let sourcefiles = await this.sourceGateway.listFiles(parsedDirectorySource);

            // and map to relative path
            sourcefiles = sourcefiles.map((x) => path.relative(parsedDirectorySource, x));

            // Builds list of sub directories in source directory
            let subDirectories = sourcefiles.map((x) => path.dirname(x));
            subDirectories = subDirectories.filter((elem, pos) => {
                return subDirectories.indexOf(elem) === pos;
            });

            // Creates sub directories on destination
            for (const subDirectory of subDirectories) {
                const parsedSubDirectory = path.join(parsedDirectoryDestination, subDirectory);

                await this.destinationGateway.createDirectory(parsedSubDirectory);
                winston.info(`Successfully created '${parsedSubDirectory}`);
            }

            // Copies files from source to destination
            for (const file of sourcefiles) {
                const parsedSourceFile = path.join(parsedDirectorySource, this.addParameters(file));
                const parsedDestinationFile = path.join(parsedDirectoryDestination, this.addParameters(file));

                winston.info(`Queuing '${parsedSourceFile}' to '${parsedDestinationFile}'`);
                await this.destinationGateway.copyFile(parsedSourceFile, parsedDestinationFile);
                winston.info(`Successfully copied '${parsedSourceFile}' to '${parsedDestinationFile}'`);

                this.statsdClient.counter('NumberOfFiles', 1, {
                    token: 'ssh-deployer',
                });
            }
        }

        // Copies files from source to destination
        const files = this.config.files;
        for (const file of files) {
            const parsedSourceFile = this.addParameters(file.source);
            const parsedDestinationFile = this.addParameters(file.destination);

            winston.info(`Queuing '${parsedSourceFile}' to '${parsedDestinationFile}'`);
            await this.destinationGateway.copyFile(parsedSourceFile, parsedDestinationFile);
            winston.info(`Successfully copied '${parsedSourceFile}' to '${parsedDestinationFile}'`);

            this.statsdClient.counter('NumberOfFiles', 1, {
                token: 'ssh-deployer',
            });
        }

        // Execute commands
        const commands = this.config.commands;
        for (const command of commands) {
            try {
                await this.destinationGateway.executeCommand(this.addParameters(command));

                this.statsdClient.counter('NumberOfCommands', 1, {
                    token: 'ssh-deployer',
                });
            } catch (err) {

            }
        }

        await this.sourceGateway.close();
        await this.destinationGateway.close();
    }

    public addParameters(str: string): string {
        return Copier.addParameters(str, this.args);
    }

    public static addParameters(str: string, args: any): string {
        for (const x in args) {
            if (args.hasOwnProperty(x)) {
                str = str.replace(`$${x}`, args[x]);
            }
        }
        return str;
    }
}