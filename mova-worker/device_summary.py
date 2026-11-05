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
    def find_entries(value, depth=0):
        if depth > 4:
            return None
        if isinstance(value, list):
            if not value or any(isinstance(item, dict) and ("did" in item or "model" in item or "mac" in item) for item in value):
                return value
            for item in value:
                found = find_entries(item, depth + 1)
                if found is not None:
                    return found
        elif isinstance(value, dict):
            for key in ("devices", "deviceList", "list", "device_list", "data"):
                if key in value:
                    found = find_entries(value[key], depth + 1)
                    if found is not None:
                        return found
            for child in value.values():
                if isinstance(child, (dict, list)):
                    found = find_entries(child, depth + 1)
                    if found is not None:
                        return found
        return None

    entries = find_entries(payload)
    if entries is None:
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
