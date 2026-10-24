"""Topic contract, payload shape, device catalog and command validation."""

from __future__ import annotations

import json

import pytest
from conftest import FakeClock
from pydantic import ValidationError

from simulator.commands import FaultCommand, device_id_from_fault_topic
from simulator.devices import build_devices, slugify
from simulator.fleet import Fleet, UnknownDeviceError
from simulator.service import SimulatorService
from simulator.settings import Settings


def test_catalog_has_three_of_each_type_with_turkish_names() -> None:
    devices = build_devices(12)
    by_id = {d.device_id: d for d in devices}
    assert len(by_id) == 12
    assert by_id["mt-01"].name == "Motor MT-01"
    assert by_id["wt-03"].name == "Türbin WT-03"
    assert by_id["pm-02"].name == "Pompa PM-02"
    assert by_id["tr-01"].name == "Trafo TR-01"
    assert by_id["mt-01"].site == "Bursa Fabrika A"
    assert by_id["wt-01"].site == "Aliağa Rüzgar Santrali"
    assert by_id["pm-01"].site == "Kocaeli Fabrika B"
    assert by_id["tr-01"].site == "İzmir Şebeke TM-3"
    assert sorted({d.type for d in devices}) == ["motor", "pump", "transformer", "wind_turbine"]


def test_slugify_turkish_site_names() -> None:
    assert slugify("İzmir Şebeke TM-3") == "izmir-sebeke-tm-3"
    assert slugify("Aliağa Rüzgar Santrali") == "aliaga-ruzgar-santrali"


def test_tick_publishes_one_message_per_device_on_contract_topics(
    fleet: Fleet, clock: FakeClock
) -> None:
    clock.advance(1)
    first = fleet.tick()
    clock.advance(1)
    second = fleet.tick()
    assert len(first) == 12
    topic, payload = first[0]
    assert topic == "smartgrid/bursa-fabrika-a/mt-01/telemetry"
    body = json.loads(payload.model_dump_json())
    assert set(body) == {
        "device_id",
        "name",
        "type",
        "site",
        "ts",
        "seq",
        "temperature",
        "vibration",
        "pressure",
        "current",
    }
    assert body["ts"] == int(clock.now * 1000) - 1000
    assert second[0][1].seq == first[0][1].seq + 1


def test_fault_topic_parsing() -> None:
    assert device_id_from_fault_topic("smartgrid/cmd/mt-01/fault") == "mt-01"
    assert device_id_from_fault_topic("smartgrid/cmd/mt-01/other") is None
    assert device_id_from_fault_topic("smartgrid/bursa/mt-01/telemetry") is None


@pytest.mark.parametrize(
    "payload",
    [
        '{"action": "inject"}',  # no type
        '{"action": "inject", "type": "meltdown"}',  # unknown type
        '{"action": "inject", "type": "overheat", "intensity": 5}',  # out of range
        '{"action": "inject", "type": "overheat", "intensity": 0.1}',
        '{"action": "explode"}',
        '{"action": "clear", "extra": 1}',  # unknown field
        "not json",
    ],
)
def test_invalid_commands_are_rejected(payload: str) -> None:
    with pytest.raises(ValidationError):
        FaultCommand.model_validate_json(payload)


def test_intensity_defaults_to_one() -> None:
    cmd = FaultCommand.model_validate_json('{"action": "inject", "type": "vibration"}')
    assert cmd.intensity == 1.0


def test_unknown_device_raises(fleet: Fleet) -> None:
    with pytest.raises(UnknownDeviceError):
        fleet.apply("xx-99", FaultCommand(action="clear"))


def test_service_drops_invalid_and_applies_valid_commands(fleet: Fleet) -> None:
    service = SimulatorService(Settings(), fleet)
    assert not service.handle_command("smartgrid/cmd/mt-01/fault", b"garbage")
    assert not service.handle_command("smartgrid/cmd/xx-99/fault", b'{"action":"clear"}')
    assert service.handle_command(
        "smartgrid/cmd/mt-01/fault", b'{"action":"inject","type":"overheat","intensity":1.5}'
    )
    snapshot = fleet.faults_snapshot()
    assert snapshot["faults"]["mt-01"]["overheat"]["intensity"] == 1.5
    # Re-sending the same command is not a change; a new intensity is.
    assert not service.handle_command(
        "smartgrid/cmd/mt-01/fault", b'{"action":"inject","type":"overheat","intensity":1.5}'
    )
    assert service.handle_command("smartgrid/cmd/all/reset", b"")
    assert fleet.faults_snapshot()["faults"] == {}


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MQTT_HOST", "abc.s1.eu.hivemq.cloud")
    monkeypatch.setenv("MQTT_PORT", "8883")
    monkeypatch.setenv("MQTT_TLS", "true")
    monkeypatch.setenv("MQTT_USERNAME", "")
    monkeypatch.setenv("PORT", "9000")
    s = Settings(_env_file=None)
    assert (s.mqtt_host, s.mqtt_port, s.mqtt_tls) == ("abc.s1.eu.hivemq.cloud", 8883, True)
    assert s.mqtt_username is None
    assert s.health_port == 9000
    assert (s.device_count, s.publish_hz) == (12, 1.0)
