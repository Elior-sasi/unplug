"""Read-only MOVA gateway bootstrap. No credentials accepted until auth is implemented."""
import os
from fastapi import FastAPI, Response
from pydantic import BaseModel

app = FastAPI(title="HomeOn MOVA gateway", docs_url=None, redoc_url=None, openapi_url=None)

class Status(BaseModel):
    connected: bool
    state: str
    capabilities: list[str]
    errorCode: str

@app.get("/health")
def health(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return {"ok": True, "service": "mova-gateway", "adapterReady": False}

@app.get("/api/mova/connection", response_model=Status, status_code=503)
def connection(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return Status(connected=False, state="connector_not_configured", capabilities=[], errorCode="MOVA_BACKEND_NOT_CONFIGURED")
