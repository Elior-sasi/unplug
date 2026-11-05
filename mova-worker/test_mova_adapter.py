import pytest
from mova_adapter import AdapterUnavailable, discover_devices

def test_missing_configuration(monkeypatch):
    monkeypatch.delenv("MOVA_USERNAME", raising=False)
    monkeypatch.delenv("MOVA_PASSWORD", raising=False)
    with pytest.raises(AdapterUnavailable):
        discover_devices()
