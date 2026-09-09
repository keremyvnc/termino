# Termino on Ubuntu

How to build and run Termino on Ubuntu (22.04 LTS and 24.04 LTS tested targets).

Termino started out as a Windows app. Terminals, projects, the editor and SSH now run
on Linux as they do on Windows: the app detects the shells installed on the machine
and offers those. One area is still Windows-only, the network panel, because it is
built on PowerShell and UAC. See [What already works](#1-what-already-works-and-what-does-not).

---

## 1. What already works, and what does not

| Area | On Ubuntu | Notes |
| --- | --- | --- |
| Electron window, React UI, tabs, palette | Works | `titleBarStyle: 'hidden'` is supported on Linux; the window looks slightly different from Windows. |
| Project tree, YAML files, form editor, import/export | Works | Data moves from `%APPDATA%` to `~/.config`. See [section 4](#4-where-data-lives). |
| SSH sessions, script engine (`send` / `expect` / `wait`) | Works | `ssh2` is pure JavaScript. |
| Local terminal tabs | Works | The app scans the system and lists what it finds: `/etc/shells`, `$SHELL` and the executables on `PATH`. Bash, zsh, fish, dash and PowerShell 7 are all recognized. |
| Network panel, adapter list, auto-apply | **Broken** | Every network call goes through `powershell.exe` and `Get-NetAdapter`. The list simply comes back empty; the app does not crash. Patch in [5.2](#52-network-layer). |
| IP assignment with elevation | **Broken** | Uses `Start-Process -Verb RunAs` (UAC). Linux needs `pkexec`. Patch in [5.2](#52-network-layer). |
| Password vault | Works with a keyring | Electron `safeStorage` uses libsecret on Linux instead of DPAPI. Without a keyring daemon the vault refuses to store secrets. See [3.3](#33-keyring-for-the-password-vault). |
| Installer package | Works | `npm run dist:linux` builds a deb and an AppImage. See [section 6](#6-packaging-deb-and-appimage). |

---

## 2. Prerequisites

### 2.1 Node.js

Node 20 or newer; the project is developed on Node 26. Ubuntu's own `nodejs`
package is usually too old, so install from NodeSource or use a version manager.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### 2.2 Build tools for native modules

`node-pty` is a native addon and is compiled during `npm install`.

```bash
sudo apt-get install -y build-essential python3 git
```

### 2.3 Electron runtime libraries

A desktop session (X11 or Wayland) plus the shared libraries Chromium needs:

```bash
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libasound2t64 libgtk-3-0 libsecret-1-0
```

On Ubuntu 22.04 the sound package is named `libasound2` instead of `libasound2t64`.

Headless servers need a virtual display; run the app under `xvfb-run` or use X
forwarding. Termino is a GUI app and has no console-only mode.

### 2.4 Optional: PowerShell

If you keep the PowerShell-based command definitions from your Windows projects, install
PowerShell 7 so those commands still run:

```bash
sudo snap install powershell --classic   # provides /snap/bin/pwsh
```

This gives you `pwsh`, not `powershell.exe`. Termino picks it up automatically and lists
it next to bash in the new-terminal menu.

---

## 3. Install and run from source

### 3.1 Get the code and dependencies

```bash
git clone <repository-url> termino
cd termino
npm install
```

`npm install` compiles `node-pty` against your system Node. Electron ships its own
Node ABI, so if the terminal fails at runtime with a message about `NODE_MODULE_VERSION`,
rebuild the addon for Electron:

```bash
npx electron-rebuild -f -w node-pty
```

Note that `npmRebuild` and `nodeGypRebuild` are both set to `false` in the `build`
block of `package.json`, so electron-builder will not do this for you.

### 3.2 Run

```bash
npm run typecheck   # optional, checks main and renderer
npm run dev         # electron-vite with hot reload
npm run start       # build once, then launch
```

If you launch Electron by hand from an editor terminal, clear `ELECTRON_RUN_AS_NODE`
first, otherwise Electron behaves like plain Node and `electron.app` is undefined:

```bash
env -u ELECTRON_RUN_AS_NODE npx electron .
```

### 3.3 Keyring for the password vault

The vault calls `safeStorage.isEncryptionAvailable()`. On Linux that is backed by
libsecret, so a keyring daemon must be running and unlocked. GNOME desktops have
`gnome-keyring` already; minimal or remote sessions usually do not.

```bash
sudo apt-get install -y gnome-keyring libsecret-1-0
```

Without a keyring, saving a password in the secrets bar fails with
`Encryption is not available on this system.` Existing SSH sessions that read their
password from the vault will then prompt as if no password were stored.

You can force a specific backend when the auto-detection picks the wrong one:

```bash
npx electron . --password-store="gnome-libsecret"
```

Secrets written on Windows cannot be read on Linux. DPAPI blobs are machine and
user bound, so `vault.json` does not transfer. Move projects across platforms and
re-enter the passwords on the new machine.

---

## 4. Where data lives

| Windows | Ubuntu |
| --- | --- |
| `%APPDATA%\termino\projects\` | `~/.config/termino/projects/` (dev) or `~/.config/Termino/projects/` (packaged) |
| `%APPDATA%\termino\vault.json` | `~/.config/termino/vault.json` |
| `%APPDATA%\termino\termino.log` | `~/.config/termino/termino.log` |
| `%APPDATA%\termino\netbackups\` | `~/.config/termino/netbackups/` |

The directory name follows the Electron app name, which is `termino` in development
and `Termino` in a packaged build, so a packaged install will not see the projects
you created with `npm run dev` unless you copy them over.

Project directories are plain YAML and are portable as they are. Only the vault is not.

---

## 5. Platform-specific parts

The shell work is already merged. The network backend is the one piece still missing.

### 5.1 Local terminal shell (done)

Shell selection is no longer hardcoded. `src/main/terminal/shells.ts` scans the machine
at startup and hands the list to the interface over the `term:shells` channel:

- On Linux it reads `/etc/shells`, adds `$SHELL`, and scans `PATH` for bash, zsh, fish,
  sh, dash, ksh and pwsh. The same binary reachable through two paths is listed once.
- The default is your login shell, falling back to bash, then zsh, then sh.
- `TERMINO_SHELL=/usr/bin/zsh` overrides the default if you want something else.
- The new-terminal menu, the command palette and the "Where to run" dropdown are all
  built from that list, so they never offer a shell the machine does not have.

A command file records the shell by name (`shell: bash`). A name that does not exist on
this machine, for example a project written on Windows that says `shell: powershell`,
falls back to the default shell instead of failing. New command files are written with
`shell: default`, which means "whatever this machine uses", so projects stay portable.

The startup gate that hides PowerShell profile output applies only to the PowerShell
family. Bash and zsh tabs print immediately, with no four-second wait.

The working directory is the user's home directory on every platform.

### 5.2 Network layer

Everything under `src/main/network/` shells out to `powershell.exe`:

- `adapters.ts` lists adapters with `Get-NetAdapter`.
- `profileScripts.ts` builds `New-NetIPAddress` and `Set-NetIPInterface` scripts.
- `elevated.ts` elevates with `Start-Process -Verb RunAs`.
- `backupStore.ts` snapshots the current state through the same scripts.

The architecture already isolates this. `AdapterWatcher` depends on the `AdapterSource`
interface, and `AutoApplier` depends on the `NetworkApplier` interface, not on the
concrete classes. So a Linux backend is a new implementation plus one line in
`src/main/services.ts`, with no changes to the callers.

A workable Linux backend:

- **Listing:** parse `ip -j addr` (JSON output), or `nmcli -t -f DEVICE,TYPE,STATE,GENERAL.HWADDR device`
  for NetworkManager systems. Adapter matching is done by MAC address, which `ip -j addr`
  reports as `address`, so the existing project files keep working.
- **Applying an address:** `nmcli con mod <name> ipv4.addresses <ip>/<prefix> ipv4.method manual`
  then `nmcli con up <name>`. For non-NetworkManager hosts, `ip addr add`.
- **DHCP:** `nmcli con mod <name> ipv4.method auto`.
- **Elevation:** `pkexec` in place of `Start-Process -Verb RunAs`. It shows the polkit
  password dialog, which is the closest equivalent of the one-shot UAC prompt.

Until that backend exists the network panel stays empty and Apply IP does nothing.
The adapter scan failure is caught in `AdapterWatcher.scan`, so the app itself keeps
running normally.

### 5.3 Windows-only assumptions elsewhere

- `resources/icon.ico` is the packaging icon. Linux builds use `resources/icon.png`,
  which is already in the repository.
- `src/main/index.ts` quits on `window-all-closed` for every platform except macOS,
  which is the correct Linux behavior. No change needed.
- Command files carried over from Windows may say `shell: cmd`. On Linux that name does
  not exist, so the command runs in the default shell. The command text itself is not
  translated, so a `dir` step still has to become `ls`.

---

## 6. Packaging: deb and AppImage

The `build` block in `package.json` declares a Linux target alongside the Windows one,
and `dist:linux` builds it:

```bash
npm run dist:linux
```

### 6.1 Building the package when you work on Windows

The package has to be produced on Linux. `node-pty` is compiled for the platform it is
built on, and `npmRebuild` is off, so a deb assembled on Windows would ship a Windows
binary inside it and every terminal tab would fail. Pick one of these three routes.

**Route A: WSL.** This machine already has the `Ubuntu-22.04` distro, so this is the
shortest path. Run the sudo lines yourself in a WSL shell, they ask for your password:

```bash
wsl -d Ubuntu-22.04
sudo apt update
sudo apt install -y build-essential python3 git curl fakeroot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Then copy the source into the Linux filesystem, leaving the Windows build outputs
behind, and build there. Building straight from `/mnt/c` also works but is much slower:

```bash
mkdir -p ~/termino
cd /mnt/c/Users/Administrator/Desktop/termino
tar --exclude=node_modules --exclude=out --exclude=release --exclude=.git -cf - . | (cd ~/termino && tar -xf -)
cd ~/termino
npm install
npm run dist:linux
cp release/*.deb release/*.AppImage /mnt/c/Users/Administrator/Desktop/
```

Build on the oldest Ubuntu release you intend to support. A package built on 22.04
installs on 24.04, but not always the other way round, because of glibc.

**Route B: Docker.** Works from PowerShell on Windows if Docker Desktop is running,
and gives a clean, repeatable environment:

```powershell
docker run --rm -v ${PWD}:/project -w /project electronuserland/builder:20 `
  bash -c "npm install && npm run dist:linux"
```

**Route C: GitHub Actions.** Build on a Linux runner and download the result as an
artifact. `.github/workflows/linux.yml`:

```yaml
name: Linux package
on: workflow_dispatch
jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run dist:linux
      - uses: actions/upload-artifact@v4
        with:
          name: termino-linux
          path: release/*.deb
```

### 6.2 Installing the result

Output lands in `release/`. Install the deb with:

```bash
sudo apt install ./release/Termino-0.1.0.deb
```

Because `npmRebuild` is `false`, the `node-pty` binary that ends up in the package is
the one currently in `node_modules`. Build the package on the same Ubuntu release you
install it on, or flip `npmRebuild` to `true` for Linux builds.

electron-builder unpacks native `.node` binaries from the asar archive on its own, so
`node-pty` needs no extra configuration. If you add an `asarUnpack` list of your own,
keep `**/node_modules/node-pty/**` in it.

---

## 7. Troubleshooting

**The app exits immediately with a sandbox error.** Ubuntu 24.04 restricts unprivileged
user namespaces, which breaks unpacked Electron builds and AppImages. Either install
the deb, which sets the SUID bit on `chrome-sandbox`, or add an AppArmor profile for
the binary. Running with `--no-sandbox` also works but weakens the renderer isolation
that `sandbox: true` in `window.ts` relies on, so use it only for a quick check.

**`Error: NODE_MODULE_VERSION mismatch` when opening a terminal tab.** `node-pty` was
built for system Node instead of Electron. Run `npx electron-rebuild -f -w node-pty`.

**Terminal tabs open blank and close.** Check `~/.config/termino/termino.log` for the
spawn error. If the shell menu is empty, no shell was found: make sure `/etc/shells`
exists or set `TERMINO_SHELL` to the full path of the shell you want.

**Saving a password fails.** No keyring, see [3.3](#33-keyring-for-the-password-vault).
Verify with `secret-tool store --label=test a b`; if that hangs or errors, the daemon
is not running.

**The network panel is empty.** Expected until [5.2](#52-network-layer) is implemented.

**Nothing renders, white window.** Look for `render-process-gone` and renderer console
lines in `~/.config/termino/termino.log`; `window.ts` forwards renderer errors there.
