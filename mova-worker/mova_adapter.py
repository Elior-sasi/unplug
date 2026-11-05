"""Experimental MOVAhome discovery adapter.

Requires a separately installed, reviewed copy of Tasshack/dreame-vacuum.
Never logs account credentials or raw device payloads.
No commands or credential-submission HTTP routes are provided.
"""
import importlib
import os

class AdapterUnavailable(RuntimeError):
    pass

def discover_devices():
    username = os.environ.get("MOVA_USERNAME")
    password = os.environ.get("MOVA_PASSWORD")
    country = os.environ.get("MOVA_COUNTRY", "il")
    if not username or not password:
        raise AdapterUnavailable("MOVA credentials are not configured on the server")
    try:
        protocol = importlib.import_module("custom_components.dreame_vacuum.dreame.protocol")
        cloud = protocol.DreameVacuumDreameHomeCloudProtocol(
            username=username, password=password, account_type="mova", country=country
        )
    except (ImportError, AttributeError) as exc:
        raise AdapterUnavailable("Reviewed MOVAhome protocol dependency is not installed") from exc

    # A login failure can require an additional verification flow. Do not bypass it.
    if not cloud.login():
        raise AdapterUnavailable("MOVAhome login failed or requires verification")
    devices = cloud.get_devices()
    if devices is None:
        raise AdapterUnavailable("MOVAhome did not return a device list")
    return devices
