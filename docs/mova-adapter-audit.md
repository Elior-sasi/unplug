# MOVA adapter compatibility audit (2026-11-05)

Upstream: https://github.com/Tasshack/dreame-vacuum (MIT license; preserve copyright/license when incorporating code).

## Verified from upstream source
- Default branch is `master`, not `main`.
- Integration manifest version observed: `v2.0.3`.
- Home Assistant integration has `iot_class: cloud_polling`.
- Python dependencies listed: `numpy`, `pycryptodome`, `python-miio`, `mini-racer`, `paho-mqtt`.
- Protocol implementation `custom_components/dreame_vacuum/dreame/protocol.py` uses HTTP, encryption, MQTT and background threads.
- The package is a Home Assistant integration, not a supported public MOVAhome REST API.

## Implications for HomeOn
1. A persistent Python worker is the safer initial deployment target; Vercel functions alone are not a drop-in replacement for background threads/MQTT.
2. Keep the existing Unplug app and its KOR endpoint separate. Build a narrowly scoped gateway with per-user authentication, secret encryption and device authorization.
3. Do not embed account passwords in the IPA, source repository, or browser storage.
4. Verify the MOVA E30 Ultra model ID, Israeli region, login challenge behavior, map decoding and supported actions on a real device before enabling controls.
5. Do not ship unverified command endpoints. HTTP 503 from `api/mova/connection.js` is intentional until the adapter is deployed.

## Next engineering deliverable
Build an independently deployable Python service with an authenticated session/secret store, device discovery and read-only status; add a deployment configuration and tests, then wire HomeOn to it. No account credentials are needed for writing the code, but an authorized real-device test is required to claim connectivity.
