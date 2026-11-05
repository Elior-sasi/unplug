"""Read-only HomeOn MOVA gateway. No account credentials accepted."""
from fastapi import FastAPI, Response
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

@app.get("/health")
def health():
    return guarded({"ok": True, "service": "mova-gateway", "adapterReady": False})

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
