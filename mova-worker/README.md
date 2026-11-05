# HomeOn MOVA gateway bootstrap

This is a **nonfunctional, read-only** deployment scaffold. It does not authenticate with MOVAhome, collect credentials, control the vacuum, or retrieve maps.

Run: `pip install -r requirements.txt && uvicorn app:app --port 8080`.

`GET /health` reports worker readiness; `GET /api/mova/connection` returns HTTP 503 until a secure MOVA adapter is implemented and tested.

Next: implement server-side authentication, encrypted credential storage, per-user authorization and the upstream Python protocol adapter. Do not expose this service as an account login until these controls exist.

## Local test result (2026-11-05)

Four fail-closed API tests passed locally using FastAPI TestClient and pytest (4 passed). This does **not** validate a MOVAhome connection, cloud deployment, or real vacuum commands. Run `pytest -q` from this directory to reproduce.

## Private discovery probe

The image now includes `mova_adapter.py` and `probe.py`. **The upstream MOVAhome protocol is not bundled or installed**, so discovery cannot run until a reviewed compatible copy is installed in the private worker. Do not run the probe on a publicly accessible endpoint.

Use a secrets manager for `MOVA_USERNAME` and `MOVA_PASSWORD`, and set `MOVA_COUNTRY=il`. Do not paste credentials into GitHub, issue comments, chat, or CI logs.

The probe is CLI-only: `python probe.py`. It prints only a response type and an optional aggregate device count, not device details. No production account test has been performed.
