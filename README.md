# ssh-deployer

SSH-Deployer is designed to run commands and copy files/directories over SSH using a preconfigured JSON file.

```
Usage: ssh-deployer [options]

Options:
  -f, --file  JSON Configuration File       [required]
```

## Getting Started

Install 'ssh-deployer' globally by running the following command

`npm instal -g ssh-deployer`

Create your JSON file. In this case it would be....

```json
{
    "machine": {
        "host": "192.168.1.100",
        "username": "your-ssh-username",
        "password": "your-ssh-password"
    },
    "commands": [
        "sudo apt-get update",
        "sudo ufw status"
    ],
    "directories": [
        {
            "source": "./dist",
            "destination": "/uploads"
        }
    ],
    "files": [
        {
            "source": "./web.config",
            "destination": "/opt/app/web.config"
        }
    ]
}
```


Saved as 'sample.json'

To execute this file, run the following command.

`ssh-deployer --file "sample.json"`

### Adding parameters to JSON file.

In the previous example the mahcine host, username and password was hard-coded.

Parameters can be added by using the '$' sign. For example.

```json
{
    "machine": {
        "host": "$host",
        "username": "$username",
        "password": "$password"
    },
    "commands": [
        "sudo apt-get update",
        "sudo ufw status"
    ],
    "directories": [
        {
            "source": "./dist",
            "destination": "/uploads"
        }
    ],
    "files": [
        {
            "source": "./web.config",
            "destination": "/opt/$appname/web.config"
        }
    ]
}
```

To execute this file with parameters, run the following command.

`ssh-deployer --file "sample.json" --host 192.168.1.100 --username hello --password world --appname myapp`