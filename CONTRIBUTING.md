# Contributing

Start with the [development quickstart](docs/DEV_QUICKSTART.md). Keep changes focused on usable communication: reachable controls, language support, reliable playback, and explicit optional prediction processing.

Run app type checks/tests and server tests before opening a pull request. For UI changes, run browser checks and include synthetic-message screenshots at small and large sizes. Record device testing separately from browser testing. Never attach someone else's recording, patient details, credentials, or real private messages to issues, fixtures, or screenshots.

Server changes should include tests for affected authentication, validation, limits, and error behavior. Provider keys stay server-only; do not add a development shortcut that ships them in client builds.
