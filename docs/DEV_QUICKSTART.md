# Development Quickstart

## Demo First

Install Node.js 24+ and npm. From the repository root:

```bash
npm ci
npm run web
```

No `.env.local` is required. Demo is the default on every launch. Select EN or BG, type a message, and press Speak. Quick phrases speak immediately. Browser/device system voices must be installed for the selected language; missing voices produce an error rather than fake playback. iOS system speech is silent when the silent switch is on. [Expo Speech](https://docs.expo.dev/versions/v54.0.0/sdk/speech/)

For a physical phone, run `npm start`. Expo Go must support this project's SDK 54; the currently installed store version may support a different SDK. Use a compatible client or your own development build. SecureStore and native audio behavior require actual device testing. [Expo Go limitations](https://docs.expo.dev/get-started/set-up-your-environment/)

To review a production web bundle without development overlays:

```bash
npm run export:web
npm run preview
# Opens at http://localhost:8083
```

## Connected Mode

This mode uses your own backend and a consenting voice. Complete [voice setup](PRIVACY_AND_VOICE_SETUP.md) before making real paid calls.

```bash
npm --prefix server ci
cd server
cp .env.example .env.local
npm run credential
```

The credential command prints a new private device token and its SHA-256 hash. Enter the hash in `INSTALLATION_TOKEN_HASHES` in `server/.env.local`; keep the token for entry in the app. Configure `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` privately. `ANTHROPIC_API_KEY` is optional. Do not paste these values into public issues or screenshots.

```bash
# In server/, after private configuration:
npm start
```

The default server address is `http://127.0.0.1:3001`. Open Voice settings in the app, choose Personal voice, enter that URL and the installation credential, and save. For browser use, `ALLOWED_ORIGINS` must exactly match the Expo URL (default `http://localhost:8081`); using a different port or `127.0.0.1` requires adding that exact origin. Reloading a browser clears the device token. On native devices, it is held in SecureStore.

Suggestions are off by default. Turn them on only after reading the notice about sending typed text. Without an Anthropic key, the server returns no suggestions; speech and quick phrases still work.

For LAN development on a trusted network, set `HOST=0.0.0.0` on the server and use your computer's current private LAN address in the app. HTTP is accepted only for local/private addresses in development; production uses HTTPS. Some native builds may require development-only transport settings; prefer an HTTPS development endpoint rather than loosening production transport policy.

## Optional WSL Networking

First try the web demo on the Windows browser. For phone access, discover current Windows and WSL addresses using `ipconfig` and `hostname -I`. If port forwarding is needed, add a rule for the specific dev port and current WSL address. Do not reset all existing portproxy rules. Restrict firewall rules to the private/trusted network and remove your specific forwarding/firewall rules after testing. Never put a paid backend on a public unauthenticated interface.

## Checks

```bash
npm run typecheck
npm test
npm --prefix server test
npx expo install --check
npx expo-doctor
npm run export:web
npm run check:public
```

Browser verification uses Playwright and needs Chromium plus OS libraries:

```bash
npx playwright install --with-deps chromium
npm run test:browser
```

The test runner starts Expo on port 8082 unless that preview already exists. Screenshots are actual browser captures saved under `docs/images/`; connected test requests use synthetic mocked responses. These tests do not establish native voice quality or device speaker output.

To regenerate the generic icon assets, run `node scripts/create-icons.mjs`.

## Troubleshooting

- **No demo sound:** install a voice for the selected language, turn off iOS silent mode, and check device volume. Some headless browsers have no installed voices.
- **Authorization failed:** generate a device credential, update the server hash allowlist, restart the server, and save the corresponding token in the app.
- **Usage limit:** minute limits reset on UTC minute boundaries; daily allowances reset at UTC midnight. Failed provider requests consume allowance too. Do not delete the database as a routine fix.
- **Browser connection blocked:** check exact CORS origin, protocol/mixed content, URL, and server availability. CORS does not replace authentication.
- **Backend cannot start:** check server secrets, credential hashes, and a writable SQLite path. Startup fails closed; health is intentionally minimal.
- **Configuration changes ignored:** restart Expo after changing client environment variables or `app.config.js`. Do not copy provider keys into client environment variables.
