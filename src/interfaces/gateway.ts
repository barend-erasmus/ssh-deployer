export interface IGateway {

    connect(): Promise<void>;
    listFiles(path: string): Promise<string[]>;
    copyFile(sourcePath: string, destinationPath: string): Promise<boolean>;
    createDirectory(path: string): Promise<boolean>;
    executeCommand(command: string): Promise<boolean>;
    close(): Promise<void>;
}
