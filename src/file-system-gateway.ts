// Imports
import * as recursiveReadSync from 'recursive-readdir-sync';

export class FileSystemGateway {

    public async connect(): Promise<void> {
        return;
    }

    public async listFiles(path: string): Promise<string[]> {
        const files: string[] = recursiveReadSync(path);

        return files.map((x) => this.toLinuxPath(x));
    }

    public async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
        throw new Error('Not Implemented');
    }

    public async createDirectory(path: string): Promise<boolean> {
        throw new Error('Not Implemented');
    }

    public async executeCommand(command: string): Promise<boolean> {
        throw new Error('Not Implemented');
    }

    public async close(): Promise<void> {
        return;
    }

    private toLinuxPath(str) {
        return str.replace(/\\/g, '/');
    }

}
