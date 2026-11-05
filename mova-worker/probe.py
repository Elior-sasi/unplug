"""CLI-only diagnostic for MOVAhome cloud device discovery.

Run inside a private worker with MOVA_USERNAME and MOVA_PASSWORD set as secrets.
No device identifiers or raw response bodies are printed.
"""
import json
import sys
from mova_adapter import AdapterUnavailable, discover_devices
from device_summary import summarize_devices

def main() -> int:
    try:
        result = discover_devices()
    except AdapterUnavailable as exc:
        print(json.dumps({"ok": False, "reason": str(exc)}, ensure_ascii=False))
        return 2
    except Exception:
        # Upstream errors may include sensitive information: do not print them.
        print(json.dumps({"ok": False, "reason": "Unexpected MOVAhome protocol failure"}))
        return 3

    # Upstream shapes vary. Only expose aggregate metadata in diagnostics.
    def count_devices(value):
        if isinstance(value, list):
            return len(value)
        if isinstance(value, dict):
            for key in ("devices", "deviceList", "list"):
                if isinstance(value.get(key), list):
                    return len(value[key])
            return None
        return None

    try:
        summaries = summarize_devices(result)
    except ValueError:
        print(json.dumps({"ok": False, "reason": "Unsupported MOVAhome device response"}))
        return 4
    print(json.dumps({"ok": True, "deviceCount": len(summaries), "responseType": type(result).__name__}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
