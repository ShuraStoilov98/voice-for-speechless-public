# Privacy And Voice Setup

## Voice Ownership

Clone only your own voice or a speaker's voice with their informed permission, following the provider's consent and verification process. Keep recordings outside the public repository. The ignored `data/audio/` directory is optional local storage, not an upload feature. A code license does not grant rights to anyone's voice.

Create a voice in your private ElevenLabs account using its current voice-cloning instructions. Account eligibility, verification, recording recommendations, and terms can change; follow the provider rather than a fixed recording-duration recipe. Copy the resulting voice ID and a restricted API key into server-only configuration. [Instant Voice Cloning](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning), [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)

## Data Flow

| Mode/action | Where the message goes | What this project retains |
| --- | --- | --- |
| Demo speech | Device/browser system speech engine | Current text in memory; no application provider API request |
| Personal speech | Your backend, then ElevenLabs | Temporary playback audio on the client; server counter totals |
| Suggestions enabled | Your backend, then Anthropic | Current suggestion words in memory; server counter totals |
| Suggestions disabled | No prediction request | No prediction-provider processing |

System speech may use the OS/browser vendor's online service. Provider retention, account telemetry, and hosting access logs are governed by the selected services; review their current controls before using sensitive communication. The project does not promise that connected-mode messages stay on the device or that providers retain nothing. [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create)

The server disables Fastify request logging and does not store message bodies or audio. A hosting reverse proxy can still record metadata; configure it not to record authorization headers or request bodies. Usage SQLite holds only counter dates/minutes, counts, and credential hashes. Protect and back up that database as operational data.

## Device Credentials

Run `npm run credential` in `server/` privately. The command prints a new 256-bit token and its SHA-256 hash. Put only the hash in `INSTALLATION_TOKEN_HASHES`; enter the token in the intended device's Voice settings. Generate a different token for each installation. Keep a private mapping of device to hash if revocation is needed.

On iOS/Android, SecureStore holds the URL and token with device-only unlocked keychain accessibility on iOS. Browser credentials stay in memory and disappear on reload. Predictions and connected mode are not enabled automatically at launch. Device credentials can still be extracted from a compromised device; limits and revocation bound their use. [Expo SecureStore](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/)

To revoke, remove that device's hash from the server configuration and restart the service. Use Forget connection in the app to remove its local saved credential. Revocation on the server is the authority; clearing one app is not enough if the token was copied. Never distribute one shared token compiled into a public app.

## Temporary Audio

Connected playback uses an OS-cache MP3 on native devices and a Blob URL in the browser. Normal completion, replacement, Stop, and component unmount clear it. A process crash or OS termination can leave a file in the native cache until the OS removes it. No recording permission is requested. Demo playback uses the system engine rather than this MP3 cache.

## Live Configuration Checklist

1. Create a consenting voice and restricted server-side ElevenLabs key.
2. Set private server configuration from `server/.env.example`; provision device tokens separately.
3. Configure provider-side budget/usage controls where available. The local request/character allowances do not guarantee a dollar ceiling.
4. Use HTTPS and a persistent writable SQLite disk, one instance, no autoscaling. Set exact browser origins if the browser client is used.
5. Test real speech, revoke a test credential, restart the backend to verify counters survive, and check provider usage before giving the app to someone else.
6. Add Anthropic privately only if suggestions are needed; review the app's opt-in notice before enabling.

Provider keys embedded in an older client build should be replaced server-side. Plan the transition: revoking those keys may stop old builds from working. Do not put replacement keys into another client bundle.
