# MOVA E30 Ultra — cloud integration implementation contract

Status: **not connected**. The Unplug UI currently has a virtual MOVA card, optional Xiaomi router presence detection, and clearly marked unavailable sections. No MOVA credentials or live map are stored.

## Confirmed upstream
- https://github.com/Tasshack/dreame-vacuum
- https://dv.tasshack.com/configuration/movahome
- https://dv.tasshack.com/installation

The upstream integration supports MOVAhome cloud accounts and maps, but requires a running Home Assistant environment. It is not a browser JavaScript SDK, and does not imply that Vercel serverless execution supports its stateful integration. MOVAhome is an unofficial cloud protocol, subject to changes.

## Architecture
1. Dedicated persistent cloud worker (not an iPhone or home PC), running the compatible integration or an audited adapter extracted under the upstream MIT license.
2. Separate authenticated Unplug API proxy; **never** expose MOVA tokens, account password, map URLs, or upstream credentials to browser localStorage or GitHub.
3. User account connection via a secure hosted form; server-side encrypted secrets, short-lived sessions, rate limiting, explicit disconnect/revoke and audit logs.
4. Device discovery and capability negotiation **before** enabling commands; do not infer capabilities from marketing model name alone.
5. Proxy live map and room metadata only after device authorization; map edits require explicit confirmation. Avoid caching personal floorplans publicly.
6. Command acknowledgments are not proof of physical execution; refresh state after issuing actions.

## API proposal (not yet deployed)
- GET /api/mova/connection — {connected, state, errorCode}
- POST /api/mova/connection — secure authenticated server-side login flow
- DELETE /api/mova/connection — revoke and delete tokens
- GET /api/mova/devices — authorized devices and capabilities
- GET /api/mova/devices/:id/state — battery, cleaning state, dock, consumables
- GET /api/mova/devices/:id/maps — real maps and rooms
- POST /api/mova/devices/:id/commands — validated actions (start, pause, dock, room/zone clean, mode)
- GET /api/mova/devices/:id/history — actual cleaning history

## Release gates
- Validate Google-linked MOVAhome account with an app-specific MOVA password on a secure backend; **do not request passwords in chat**.
- Confirm actual model identifier, region, map decode, room IDs and supported controls against the owner's device.
- Verify network failures, expired sessions, MFA/challenge flows, authorization boundaries, redaction and secret rotation.
- Enable no live controls in Unplug until the API and device are tested end to end.

## Environment
The existing Unplug frontend in index.html uses a separate KOR Cloud Functions endpoint for other smart-home devices. Do not send MOVA credentials to that service without an explicit reviewed backend implementation and isolation.
