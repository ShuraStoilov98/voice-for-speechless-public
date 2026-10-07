# Build And Distribution

The source/demo does not require App Store submission. The public derivative has not been submitted as a new native release. A prior private prototype's beta does not establish that this version has passed device testing or review.

## Your Own App Identity

Keep demo development unlinked to any owner's Expo project. To distribute your fork, create your own Expo/EAS project and Apple/Google app identity. Copy `.env.example` to an ignored `.env.local` and set the non-secret `EAS_PROJECT_ID`, optional `EAS_OWNER`, `APP_BUNDLE_IDENTIFIER`, and `APP_ANDROID_PACKAGE` values. Use identifiers you own, for example `com.yourcompany.speechapp`; the example is not an identifier reserved for this project.

Install/login to EAS CLI, create the project from your own Expo account, and follow its initialization prompts. With dynamic config, project association may need to be entered manually as `EAS_PROJECT_ID`. Set the same non-secret identity values in the appropriate EAS environment for cloud builds. The config rejects EAS builds missing the project's identities. Provider keys belong only on the backend, never in any mobile-build environment/config. [EAS project setup](https://docs.expo.dev/build/setup/), [Environment variables](https://docs.expo.dev/eas/environment-variables/)

Development/preview use their own environments; production auto-increments the remote build number. The app uses Expo Audio's configuration to disable microphone recording on iOS/Android, and explicitly blocks Android recording permission. Playback capability is retained. [Expo Audio configuration](https://docs.expo.dev/versions/v54.0.0/sdk/audio/)

## iOS

Enroll in the Apple Developer Program, create the app record and owned bundle identifier, and authenticate for signing. EAS can manage signing when authorized. For a development client, install the SDK-compatible `expo-dev-client` dependency in your fork and register your test device; this optional dependency is not required for the browser demo.

```bash
# After your identity/account setup and native testing:
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

EAS submission uploads the binary to App Store Connect. Complete beta testing/review and tester access there; upload alone is not an App Store launch. Complete store metadata, privacy disclosures, screenshots, review details, and a release decision separately for public store distribution. State that connected speech sends text to providers and explain installation credentials to reviewers. [Expo iOS submission](https://docs.expo.dev/submit/ios/), [Apple TestFlight](https://developer.apple.com/testflight/)

Do not publish a public TestFlight link or App Store badge until a verified link/status exists for the advertised app version.

## Native Acceptance Checklist

- Small and large iPhone: primary Speak/Stop above input with the keyboard visible; clear keeps focus.
- English/Bulgarian input, keyboard autocorrect, long phrases, and large accessibility text.
- Demo speech with a matching installed voice and the silent switch off.
- Connected speech including the silent switch on, Stop, interruptions, headphones/Bluetooth disconnect, and repeated requests.
- Connection save/relaunch/forget and server-side credential revocation.
- Suggestions off/on, failure fallback, stale-result cancellation, and limits/errors.
- Tablet layout and a check that no microphone prompt appears.
- Voice quality judged by the consenting speaker; automated/browser tests do not establish this.

## Backend Hosting

`render.yaml` prepares an optional single-instance Docker backend with a persistent disk. Review the current host costs before creating it. Supply private env values through the host's secret settings. `/data` must be writable by container UID 1000 and persistent; validate this on the host. Keep one instance and no autoscaling. Configure exact origins and provider spend controls, then test speech, revocation, and counter persistence. [Render persistent disks](https://render.com/docs/disks), [Blueprint reference](https://render.com/docs/blueprint-spec)

The container/host deployment has not been verified merely by writing these files. A host with a different disk-permission model may need adjustment. Local server tests use synthetic providers and verify quota persistence separately.

## Updating The Original Private Beta

Keep the private app's bundle identifier, EAS project, signing identity, and App Store Connect record. Port the reviewed client/backend changes into a private integration branch there, then provision its device credentials. Test before uploading an update. Increment its own release/build versions according to that app's record; do not substitute the fork's identities.

Coordinate revocation of the old embedded provider keys with that update. Older builds can stop working when the keys are revoked. Preserve the original repository privately; importing its Git history into this public derivative would reintroduce the private recordings.
