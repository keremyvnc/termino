<div align="center">

<img src="resources/icon.png" alt="Termino" width="96" />

# Termino

**Project-based test terminal for Windows**

Ready-made commands · Network profiles · One-click SSH sessions

![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)

</div>

---

## What is it?

Termino puts the routine every field or lab test starts with into a single window:

1. Pick the project
2. Set your PC's IP / subnet to match the device
3. Connect over SSH, hop through a jump host if needed, become `root`
4. Run the commands you always run

A project is a folder: **sessions**, **commands** and a **network profile**, all defined in YAML. Click a file in the tree on the left, hit ▶ to run it. You never have to look at YAML if you don't want to; everything is editable as a form too.

## Highlights

| | |
|---|---|
| 🖥️ **Local terminal** | PowerShell / CMD tabs powered by xterm.js + node-pty, Ctrl+F search, copy & paste |
| 🔐 **SSH sessions** | Built on ssh2; passwords live in the Windows DPAPI vault and never touch YAML |
| 🌐 **Network profiles** | Assign IP / mask / gateway to an adapter, fall back to DHCP, restore the previous config. Only that step is elevated via UAC |
| 🔌 **Auto-apply** | When the adapter comes up, the project's profile is applied automatically (matched by MAC, so renamed adapters still work) |
| 📜 **Script engine** | `send` / `expect` / `wait` steps; `{{ip}}` comes from the profile, `{{secret:name}}` from the vault |
| 🔗 **Chained logins** | Jump host → `ssh -i` → `su -` is just a script, with a ready template |
| ⌨️ **Command palette** | Ctrl+K to reach any command, session or quick action |
| 📁 **Plain files** | Projects live under `%APPDATA%/termino/projects/<id>/` as YAML; edit them externally, the app watches for changes |
| 📤 **Export / import** | Share a project as JSON; passwords are never exported |

## Layout

```
┌──────────────┬──────────────────────────────────┬──────────────┐
│  Projects    │  [ Terminal 1 ] [ SSH: device ]  │  Network     │
│  ├ project   │                                  │  Adapter     │
│  ├ sessions/ │   $ ping {{ip}}                  │  IP / Mask   │
│  │  └ device │   Reply from 192.168.56.10 ...   │  [ Apply ]   │
│  └ commands/ │                                  │  [ DHCP ]    │
│     ├ ▶ ping │                                  │              │
│     └ ▶ logs │                                  │              │
└──────────────┴──────────────────────────────────┴──────────────┘
```

## What a project looks like

```
%APPDATA%/termino/projects/<id>/
├── project.yaml          # name, network profile, autoApply
├── sessions/
│   └── device.yaml       # SSH target + login script
└── commands/
    └── fetch-logs.yaml   # step sequence and the session it runs in
```

**sessions/device.yaml**

```yaml
name: device
type: ssh
host: "{{ip}}"
username: root
credentialRef: term:device
steps:
  - expect: "(?i)password:"
  - send: "{{secret:term:device}}"
  - expect: "\$ $"
  - send: "su -"
```

**commands/fetch-logs.yaml**

```yaml
name: Fetch logs
target: device
steps:
  - send: "tail -n 200 /var/log/app.log"
  - wait: 500
  - run: "Restart service"   # call another command
```

## Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Command palette |
| `Ctrl+F` | Search in terminal |
| `Ctrl+Shift+T` / `Ctrl+Shift+W` | Open / close tab |
| `Alt+1..9` | Select tab |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste |
| `Ctrl+S` | Save in YAML view |

## Installation

Prebuilt package: `release/Termino-Setup-<version>.exe` (per-user NSIS installer, custom directory supported).

To run from source:

```bash
npm install
npm run dev        # development with HMR
npm run build      # compiles into out/
npm run typecheck  # type-checks main + renderer
npm run dist       # builds the installer (release/)
```

> Windows only: network operations rely on PowerShell + UAC, and the password vault uses DPAPI.

## Architecture

The Electron main process and the React UI are separated by `contextIsolation` + `sandbox`; the renderer only sees the `window.api` bridge.

```
src/main/       main process
  services.ts     object graph (single composition root)
  network/        PowerShell runner, UAC elevation, backup/restore, adapter watcher
  terminal/       TerminalSession interface, LocalPtySession, SshSession, ScriptRunner
  project/        YAML store on disk, fs.watch
  ipc/            channel registrations (project / network / terminal / credential / app)
src/preload/    window.api bridge
src/renderer/   React + zustand; sidebar, editor (CodeMirror), terminalArea, network, palette
src/shared/     types, IPC channel names, YAML mapping, IPv4 helpers
```

Design principles:

- **Passwords** are decrypted only in the main process; YAML holds nothing but a `credentialRef` name.
- **Adapters** are matched by MAC address, not by name.
- **Elevation** is granted only to the PowerShell script that changes the IP, never to the whole app.
- **New terminal types** (serial, telnet, …) only need a `TerminalSession` implementation and one line in `sessionFactories.ts`.

## Built with

Electron · React · TypeScript · electron-vite · zustand · xterm.js · node-pty · ssh2 · CodeMirror · yaml

## License

Personal project; no license has been chosen yet.
