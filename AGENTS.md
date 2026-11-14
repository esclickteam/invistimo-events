

## Local checks before GitHub Actions

Run `bash scripts/ci-local.sh` before pushing. It runs TypeScript, lint, unit tests, and the production build when this repository has those commands. Extra arguments run after that gate, for a test focused on the files that changed.

GitHub Actions stays required. Do not bypass it. A new commit cancels the older pull request run of the same workflow. A push to `main` is not cancelled.
