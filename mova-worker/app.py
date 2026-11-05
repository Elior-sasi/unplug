"""Private HomeOn MOVA gateway.

Cloud Run IAM must remain enabled. No credentials are accepted via HTTP.
"""
import importlib.util
from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="HomeOn MOVA gateway", docs_url=None, redoc_url=None, openapi_url=None)


def guarded(payload: dict, status: int = 200) -> JSONResponse:
    return JSONResponse(
        payload,
        status_code=status,
        headers={
            "Cache-Control": "no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
        },
    )


def setup_state() -> dict:
    """Report safe readiness signals, never secrets or account identifiers."""
    credentials_present = bool(os.environ.get("MOVA_USERNAME")) and bool(
        os.environ.get("MOVA_PASSWORD")
    )
    adapter_installed = (\n        Path("/srv/custom_components/dreame_vacuum/dreame/protocol.py").is_file()\n        and importlib.util.find_spec("requests") is not None\n    )
    return {
        "credentialsConfigured": credentials_present,
        "adapterInstalled": adapter_installed,
        "readyForDiscovery": credentials_present and adapter_installed,
        "connectionVerified": False,
        "commandsEnabled": False,
    }


@app.get("/health")
def health():
    return guarded({"ok": True, "service": "mova-gateway", "adapterReady": setup_state()["readyForDiscovery"]})


@app.get("/api/mova/setup-status")
def setup_status():
    return guarded(setup_state())


@app.get("/api/mova/connection")
def connection():
    return guarded({
        "connected": False,
        "state": "connector_not_configured",
        "capabilities": [],
        "errorCode": "MOVA_BACKEND_NOT_CONFIGURED",
    }, 503)


@app.api_route("/api/mova/connection", methods=["POST", "PUT", "PATCH", "DELETE"])
def connection_mutation():
    return guarded({"ok": False, "errorCode": "MOVA_BACKEND_NOT_CONFIGURED"}, 503)


@app.api_route("/api/mova/devices/{device_id}/commands", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def command_disabled(device_id: str):
    return guarded({"ok": False, "errorCode": "MOVA_COMMANDS_DISABLED"}, 503)
