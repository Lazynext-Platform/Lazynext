# Source Code, Documents, and Resources For https://Lazynext-Editor.com.

## Requirements

- [Hunim](https://github.com/Lazynext-Corporation/hunim)
- rsync and ssh (for deployment)

```
# Run local
hunim server

# Publish
make upload
```

## Server Requirements

- systemd
- reverse proxy (nginx, etc.)
- [bun](https://bun.com)

## Deployment Example

file `/etc/systemd/system/ae.service`

```
[Unit]
Description=AutoEditor Website
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/Lazynext-Editor
ExecStart=/root/.bun/bin/bun run server.js

[Install]
WantedBy=multi-user.target
```
