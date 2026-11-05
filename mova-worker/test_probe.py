"""Tests for private, redacted MOVA discovery diagnostics."""
import json
from unittest.mock import patch
import probe

def test_probe_redacts_device_identifiers(capsys):
    with patch.object(probe, "discover_devices", return_value=[{"did": "sensitive-device-id"}]):
        result = probe.main()
    output = capsys.readouterr().out
    assert result == 0
    assert json.loads(output) == {"ok": True, "deviceCount": 1, "responseType": "list"}
    assert "sensitive-device-id" not in output

def test_probe_does_not_print_upstream_exceptions(capsys):
    with patch.object(probe, "discover_devices", side_effect=RuntimeError("private token value")):
        result = probe.main()
    output = capsys.readouterr().out
    assert result == 3
    assert "private token value" not in output
