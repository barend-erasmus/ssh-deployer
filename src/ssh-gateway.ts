// Imports
import * as node_ssh from 'node-ssh';

export class SSHGateway {

    public ssh: node_ssh = new node_ssh();
    public sftp: any = null;
    public shell: any = null;

    constructor(private host: string, private username: string, private password: string) {

    }

    public async connect(): Promise<void> {
        await this.ssh.connect({
            host: this.host,
            password: this.password,
            username: this.username,
        });

        this.sftp = await this.ssh.requestSFTP();
        this.shell = await this.ssh.requestShell();

        return;
    }

    public async listFiles(path: string): Promise<string[]> {
        throw new Error('Not Implemented');
    }

    public async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
        sourcePath = this.toLinuxPath(sourcePath);
        destinationPath = this.toLinuxPath(destinationPath);

        await this.ssh.putFile(sourcePath, destinationPath, this.sftp);

        return true;
    }

    public async createDirectory(path: string): Promise<boolean> {

        path = this.toLinuxPath(path);
        await this.ssh.execCommand(`mkdir -p ${path}`);

        return true;
    }

    public async executeCommand(command: string): Promise<boolean> {
        const result = await this.ssh.execCommand(command);

        if (result.code !== 0) {
            throw new Error(result.stderr);

            // if (argv.exitOnError) {
            //     process.exit(result.code);
            // }
        } else {
            return true;
        }
    }

    public async close(): Promise<void> {
        this.ssh.dispose();

        return;
    }

    private toLinuxPath(str) {
        return str.replace(/\\/g, '/');
    }

}
