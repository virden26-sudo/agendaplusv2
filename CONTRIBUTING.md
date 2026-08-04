Contributing
============

This project follows a conservative dependency upgrade policy:

- Dependabot will open weekly PRs for non-breaking upgrades (minor/patch).
- Major upgrades require manual approval and a dedicated migration branch.

Before opening a PR:

- Run `npm ci` then `npm run build` and fix compilation issues.
- Ensure local environment files (e.g. .vs, keystore) are not committed.
