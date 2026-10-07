# Architecture

`App.tsx` owns the communication screen and a compact connection/settings modal. `src/locales.ts` contains English/Bulgarian UI strings and quick phrases. `src/connection.ts` validates backend URLs and sends authenticated requests; `src/credentials.ts` stores native connection details in SecureStore. Browser credentials stay only in React memory. `src/prediction.ts` cancels stale results immediately, including during the debounce interval. `src/audioCache.ts` handles temporary connected audio.

The screen starts in demo mode even when connection details are stored. System speech uses a matching installed language voice. In connected mode, a generated audio response plays through Expo Audio. Quick phrases pass their message directly to speech rather than depending on an asynchronous state update. A ref guards rapid repeated speech requests; Stop cancels the request and detaches playback.

## Request Contract

| Endpoint | Authorization | Request | Response |
| --- | --- | --- | --- |
| `GET /health` | None | None | Minimal `{ "status": "ok" }` |
| `POST /v1/speech` | Installation bearer credential | `{ "text": "I need water", "language": "en" }` | Up to 2 MiB of `audio/mpeg` |
| `POST /v1/predictions` | Installation bearer credential | Same shape | `{ "words": ["water"] }`, up to three short words |

Languages are `en` or `bg`; text is nonblank and at most 500 characters. Additional JSON properties are rejected. Voice ID and models are fixed in server configuration; clients cannot select someone else's voice or an arbitrary upstream address.

Provider failures produce controlled errors; request validation returns 400, missing/wrong credentials 401, request-size violations 413, usage/concurrency limits 429, provider failures 502, timeout 504, and database/service failures 503. Responses are marked `no-store`. Provider bodies and message text are not logged.

## Quotas

SQLite atomically reserves request and character allowances before provider work. Both speech and prediction calls count, including failed upstream calls. Default limits are 12 requests per credential per UTC minute, 300 requests globally per UTC day, 20,000 input characters globally per UTC day, two concurrent provider requests, and a 15-second provider timeout. No automatic retries occur. These are usage allowances, not a priced billing ledger.

Counter tables hold dates/minutes, counts, and credential hashes. They survive process restarts on the same persistent database. Corrupt/unwritable storage fails closed. A UTC day rollover replaces previous-day counters; stale minute rows are removed. Keep the host clock accurate.

One process on one persistent local disk is the deployment contract. SQLite coordinates reservations on the same file, but concurrency is process-local. Separate replicas with independent disks bypass the global allowance; serverless/ephemeral filesystems reset it. Do not autoscale this template. A distributed deployment needs shared persistent quotas and global concurrency control.

## Tradeoffs

- The demo lets developers inspect and use the app before account setup; it does not reproduce a cloned voice.
- Device credentials authorize one server owner's voice and can be revoked individually. They are scoped client credentials, not impossible-to-extract secrets.
- Suggestions are optional because a communication message should not have to visit a language model to be spoken.
- No recording/upload service means voice consent and enrollment remain with the provider account owner.
- A small Fastify server with built-in Node SQLite avoids extra infrastructure for the intended single-owner use. [Fastify schemas](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [Node SQLite](https://nodejs.org/api/sqlite.html)
