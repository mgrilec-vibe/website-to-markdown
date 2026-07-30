### Description

After updating to version v2.25.0, the command `docker compose pull docker-compose.yaml` gives the error `'version' is obsolete`

### Steps To Reproduce

_No response_

### Compose Version

```
v2.25.0
```

### Docker Environment

```
Client: Docker Engine - Community
 Version:    24.0.7
 Context:    default
 Debug Mode: false
 Plugins:
  buildx: Docker Buildx (Docker Inc.)
    Version:  v0.12.1
    Path:     /root/.docker/cli-plugins/docker-buildx
  compose: Docker Compose (Docker Inc.)
    Version:  v2.25.0
    Path:     /root/.docker/cli-plugins/docker-compose

Server:
 Containers: 27
  Running: 27
  Paused: 0
  Stopped: 0
 Images: 24
 Server Version: 24.0.7
 Storage Driver: overlay2
  Backing Filesystem: extfs
  Supports d_type: true
  Using metacopy: false
  Native Overlay Diff: true
  userxattr: false
 Logging Driver: json-file
 Cgroup Driver: systemd
 Cgroup Version: 2
 Plugins:
  Volume: local
  Network: bridge host ipvlan macvlan null overlay
  Log: awslogs fluentd gcplogs gelf journald json-file local logentries splunk syslog
 Swarm: inactive
 Runtimes: io.containerd.runc.v2 runc
 Default Runtime: runc
 Init Binary: docker-init
 containerd version: 3dd1e886e55dd695541fdcd67420c2888645a495
 runc version: v1.1.10-0-g18a0cb0
 init version: de40ad0
 Security Options:
  apparmor
  seccomp
   Profile: builtin
  cgroupns
 Kernel Version: 6.5.13-1-pve
 Operating System: Debian GNU/Linux 12 (bookworm)
 OSType: linux
 Architecture: x86_64
 CPUs: 4
 Total Memory: 6.723GiB
 Name: hpt630
 ID: beea869f-20a2-4a3f-a514-6ff0f77b5433
 Docker Root Dir: /srv/dev-disk-by-uuid-c1677ca2-07a1-4495-b5c3-ec3f921e2e60/docker
 Debug Mode: false
 Experimental: false
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false
```

### Anything else?

_No response_
