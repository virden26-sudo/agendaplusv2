# Free native development workflow

Use Acode on Android, your existing editor on Windows/Debian, and GitHub for
shared commits and cloud build jobs. Each device keeps a complete local checkout.
Editing and local commits work offline after initial setup. Network access is
needed to synchronize or use cloud builds. No always-on personal PC is required.
This workflow uses existing tools; it does not create a new editor application.

## Start on the phone

In a current Acode installation, open the app menu and select Terminal. Its first
launch installs the Alpine Linux environment. Then run:

```sh
apk update
apk add git openssh-client
mkdir -p ~/projects
cd ~/projects
git clone --single-branch --branch fix/production-build-pipelines https://github.com/virden26-sudo/agendaplusv2.git
cd agendaplusv2
acode .
```

If that folder already exists, open it instead of cloning again. Check its branch
and changes before updating it. Keep this checkout in Acode's terminal home,
which does not require shared-storage permissions. Do not uninstall Acode or its
terminal without backing up unpublished work. Save open editor buffers before
running Git commands. The terminal and `acode` integration require a version that
includes these features; older plugin terminals may behave differently.

The repair branch is used because main does not yet contain the build fixes.
It already has draft PR #4, so commits pushed to that branch update that PR.
Keep changes on this branch limited to build/setup work. Use a separate branch
and PR for unrelated feature work. After the repair is merged, new work should
start from the updated main branch instead.

## Save and switch devices

Run `sh scripts/workspace.sh status` to inspect changes without internet.
Configure Git's author name and your GitHub-provided commit email on each new
device before the first commit. Do not invent an email or paste access tokens
into tracked files. Stage specific intended files and commit locally:

```sh
git diff
git add path/to/file-you-edited
git commit -m "Describe the change"
```

Replace the file path and message with your actual change. When online, run:

```sh
sh scripts/workspace.sh publish
```

The public clone does not require sign-in, but publishing requires GitHub Git
authentication (SSH or an HTTPS credential helper/token with appropriate access).
Your ordinary GitHub account password is not a Git HTTPS password. Complete
authentication on the device before expecting publish to work; no credentials
are installed by this repository. See GitHub's authentication documentation:
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github

On another device, use the same repository and working branch, commit its local
edits first, then run `sh scripts/workspace.sh update`. On Windows use Git Bash
for these shell shortcuts. Update permits only a fast-forward. If two devices
have different new commits, it stops rather than merging, discarding changes,
or force-pushing. Review and reconcile those commits before continuing.

## What runs where

| Work | Phone with Acode | Windows / Debian | Cloud CI |
| --- | --- | --- | --- |
| Read/edit source; local commits | Yes, offline after clone | Yes | Not needed |
| Sync committed work | Internet and Git authentication | Internet and Git authentication | Not needed |
| Full Next.js development/testing | Not verified on Android | Supported build environment required | Frontend workflow |
| Android APK | Local phone compilation not verified | JDK 21 and SDK 36 required | Android workflow |
| Windows Electron installer | Cannot run a Windows installer | Windows build and execution checks | Windows workflow |

Do not install the desktop project's entire dependency tree on the phone and
assume it will compile: Android/ARM package support, native binaries, and memory
constraints need separate validation. Acode's editor and Git can be useful without
that dependency installation. APK device testing can happen on the phone after
a successful build is downloaded.

## Cloud build availability and cost

Standard GitHub-hosted runners for public repositories are free. Build artifacts
and caches have separate storage allowances; keep retention limited and do not
enable paid usage to follow this setup. GitHub Actions is currently blocked by an
account billing lock, so no successful cloud build is promised here. Resolve it
through account billing/support as described in BUILD_AUDIT.md, then rerun PR #4's
checks. Local phone edits and Git commits do not depend on that runner service.

After successful checks, Android CI provides a debug APK artifact; the Windows
workflow provides an installer. Release signing needs the separately configured
credentials documented in RELEASING.md. No subscription, signing credential,
remote-access service, or paid cloud resource is configured by this workflow.

Official references:
- Acode terminal: https://docs.acode.app/user-guide/terminal
- GitHub build billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Billing locks: https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account
