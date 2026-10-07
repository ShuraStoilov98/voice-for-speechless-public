# Security

Provider keys belong on the backend. Treat installation credentials as revocable client credentials and keep provider/hosting limits configured. Do not expose an unauthenticated paid proxy or run separate replicas against independent quota databases.

If GitHub's **Report a vulnerability** option is available under this repository's Security tab, use it for a private report. Until the owner enables that option or supplies a verified private contact, do not publish sensitive exploit details, credentials, recordings, or messages in an issue. A public issue can request a private reporting channel without including sensitive details.

See [privacy/setup](docs/PRIVACY_AND_VOICE_SETUP.md) and [release verification](docs/PUBLIC_RELEASE_REPORT.md) for the current deployment contract and remaining checks. Rotate compromised provider keys and remove affected installation hashes server-side. Removing a credential from one device is not server-side revocation.
