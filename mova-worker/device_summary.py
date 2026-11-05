"""Read-only MOVA adapter boundary: never return upstream raw account/device data to HTTP."""
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class DeviceSummary:
    name: str
    model: str
    online: bool | None

def summarize_devices(payload: Any) -> list[DeviceSummary]:
    """Accept known list shapes, omit identifiers, tokens, maps and addresses."""
    if isinstance(payload, list):
        entries = payload
    elif isinstance(payload, dict):
        entries = None
        for key in ("devices", "deviceList", "list"):
            if isinstance(payload.get(key), list):
                entries = payload[key]
                break
        if entries is None:
            raise ValueError("Unsupported MOVA device-list response")
    else:
        raise ValueError("Unsupported MOVA device-list response")
    output = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        model = entry.get("model")
        online = entry.get("online")
        output.append(DeviceSummary(
            name=name[:80] if isinstance(name, str) else "MOVA device",
            model=model[:80] if isinstance(model, str) else "unknown",
            online=online if isinstance(online, bool) else None,
        ))
    return output
