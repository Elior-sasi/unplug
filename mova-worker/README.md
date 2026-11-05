# HomeOn MOVA gateway bootstrap

This is a **nonfunctional, read-only** deployment scaffold. It does not authenticate with MOVAhome, collect credentials, control the vacuum, or retrieve maps.

Run: `pip install -r requirements.txt && uvicorn app:app --port 8080`.

`GET /health` reports worker readiness; `GET /api/mova/connection` returns HTTP 503 until a secure MOVA adapter is implemented and tested.

Next: implement server-side authentication, encrypted credential storage, per-user authorization and the upstream Python protocol adapter. Do not expose this service as an account login until these controls exist.
