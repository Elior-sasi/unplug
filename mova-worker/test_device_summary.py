from device_summary import summarize_devices
import pytest

def test_summary_removes_sensitive_fields():
    result = summarize_devices([{
        "name": "MOVA E30 Ultra",
        "model": "mova.e30",
        "online": True,
        "did": "secret-id",
        "token": "secret-token",
        "ip": "192.168.1.2",
        "map": {"secret": "layout"},
    }])
    assert len(result) == 1
    assert result[0].name == "MOVA E30 Ultra"
    assert result[0].model == "mova.e30"
    assert not hasattr(result[0], "token")
    assert not hasattr(result[0], "did")
    assert not hasattr(result[0], "map")

def test_unsupported_shape_fails_closed():
    with pytest.raises(ValueError):
        summarize_devices({"unknown": [{"name": "vacuum"}]})
