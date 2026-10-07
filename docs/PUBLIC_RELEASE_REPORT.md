# Public Release Verification

Prepared locally on 2026-10-07. No repository was published, no paid backend was deployed, and no new store build was submitted. This derivative uses an independent Git history; its private predecessor's history and recordings are not included.

## Implemented

- English/Bulgarian communication screen with one-tap phrases, Speak/Stop, clear-and-refocus, and accessible controls.
- Default system-voice demo with no provider credentials or application provider requests.
- Connected backend with server-held provider keys, a fixed consenting voice, and hashed per-installation credentials.
- Native SecureStore and browser memory-only credentials. Prediction processing is opt-in.
- SQLite daily request/character limits and per-credential minute counters, global concurrency and provider timeouts. Reservations survive restart on the same persistent disk; storage failures fail closed.
- Generic generated icons, actual synthetic-message browser screenshots, MIT license, setup/privacy/distribution docs, and scoped CI.

## Verification

Local verification is complete. External account/device checks remain pending and are not passes.

| Check | Result |
| --- | --- |
| App TypeScript, `npm run typecheck` | Passed |
| Client logic, `npm test` | 7 tests passed: URL policy, error mapping, cancellation and stale suggestion guards |
| Backend, `npm --prefix server test` | 11 tests passed: authentication, schemas, quota persistence/shared-file atomicity, concurrency, timeout, safe errors and provider adapters |
| Online `npx expo install --check` | Passed: SDK dependencies up to date |
| Online `npx expo-doctor` | 18/18 checks passed after fixing the native asset peer dependency |
| `npx expo prebuild --no-install` | Passed with generic test identifiers; generated trees ignored |
| Microphone configuration | iOS microphone usage string absent; Android `RECORD_AUDIO` has manifest removal; playback permission retained |
| Production exports | Separate web, iOS Hermes and Android Hermes exports passed with two workers; initial simultaneous all-platform attempt was terminated and replaced by these completed exports |
| Browser interactions | 9/9 passed on both the development server and production export at 1440x1000, 390x844 and 320x740, including mock audio decoding/Blob cleanup |
| Known private-value comparison | Passed over source, media and exported bundles without printing values |
| Gitleaks 8.30.1 file scan | Passed; scanner download matched pinned official checksum |
| Gitleaks export scan | Passed over 11.28 MB of exported data |
| Documentation paths | All local Markdown links and image paths resolve; 9 actual screenshots and one real interaction clip reviewed |
| Clean independent history | Passed: Gitleaks scanned the new root commit with all refs; no predecessor history or remote imported |
| Fresh-checkout lockfile installs | Passed: separate app/server `npm ci --offline --no-audit --no-fund` using cached registry packages, with no source-checkout dependency fallback |
| Fresh-checkout behavior | Passed: TypeScript, 7 client tests, 11 server tests, documentation/public-file checks and production web export, with no environment files |
| Remote CI | Prepared; not run because publication is explicitly deferred |
| Native hardware, paid providers, hosted Docker | Pending owner account/device checks; not represented by mocks |

The production web build was served locally for the final screenshots, interaction clip and 9 browser tests. The headless browser tests verify UI behavior and synthetic connected audio, not an audible system/clone voice on a real device. CI commands were exercised locally; the actual GitHub workflow still awaits the first authorized push. A harmless Node warning about module-type inference occurs in the TypeScript logic tests; tests pass.

## Dependency Findings

The app root audit currently reports **27 findings: 22 high, 5 moderate, 0 critical**. Many are dependency-chain effects of the same underlying packages. Audit recommendations to install Expo 44 or React Native 0.87 were not forced into this SDK 54 project.

| Underlying package | Exposure in this project | Current handling |
| --- | --- | --- |
| `braces@3.0.3` | Metro/Jest pattern processing; malicious deeply nested patterns can exhaust the tooling stack | Latest inspected package remains affected. Use reviewed source/config, keep Metro local/trusted, track upstream patch. |
| `node-forge@1.4.0` | Expo CLI/code-signing certificate verification, not backend TTS authorization | Latest resolved package remains affected. Do not treat this review as validation of signed OTA updates; no OTA update workflow is configured. Track upstream fix. |
| `image-size@1.2.1` | Metro inspection of build assets; crafted image formats can hang tooling | Included assets are code-generated/reviewed PNGs. Patched 2.x changes the import/API expected by Metro 0.83; avoid an untested major override. Revisit with a coordinated SDK/toolchain upgrade. |
| `sprintf-js@1.0.3` | Transitive Jest/YAML config formatting; unbounded precision can exhaust memory | Avoid untrusted config/format input and track upstream patch. App tests use Node's runner, not Jest. |

Patched Sharp and PostCSS were installed, and `xcode`'s UUID dependency was narrowly overridden to a compatible CJS-capable 11.x release. Native prebuild and exports exercise those compatibility assumptions. Unused legacy AV/image packages were omitted. The server has an independent lockfile and its final online production audit reported **0 vulnerabilities**.

These findings remain visible. The assessment is limited to this source/demo deployment contract: paid backend has none of these dependencies; build tooling processes reviewed local assets/config and is not a public service. Public source can be reviewed with these documented limits, but a new distributed native release still needs its device/account checks. Rerun audits before publication; registry findings can change.

## Required Owner Decisions

1. Approve the public title, UI, and conservative family-origin story. Supply any approved details, actual beta status/link, and measurable usage/outcomes; no invented metrics will be added.
2. Decide whether source/demo publication is sufficient initially, or whether a live connected demo is also required. The second option needs provider/hosting setup and separate live tests.
3. Test the intended native device and consenting voice before distributing a new connected beta. Browser playback fixtures do not establish that voice quality or silent-mode behavior.
4. Confirm the destination account/repository name and a verified private security reporting channel, then authorize publication of the reviewed candidate.

## Publication Procedure

Publish only this independent candidate after review. Leave the predecessor private. A protected branch in a public repository does not hide its historical recordings.

1. Check the candidate's staged/tracked inventory, tree, and history. Run `npm run check:public` and `bash scripts/scan-secrets.sh`; inspect media and dependency notes. Re-run verification if final edits change behavior.
2. Create a new, empty GitHub repository in the selected account. Prefer creating it private for a last review, push only this clean history, and change visibility after explicit approval. Do not fork/push the private predecessor's history or use its existing remote.
3. Verify the remote file/history inventory, first CI run, README rendering/media, MIT detection, and private vulnerability reporting before switching visibility.
4. Add the project description and topics such as `accessibility`, `text-to-speech`, `react-native`, `expo`, `voice-cloning`, and `bulgarian`. Pin it on the owner's profile if selected.
5. Add an approved beta/demo link only after checking its version and access status. Optional live deployment and App Store submission are separate actions.

Git commands depend on the chosen destination and are intentionally not executed during this migration. The owner's private workspace handoff records the candidate path, independent commit, backup, and exact commands for the selected route.
