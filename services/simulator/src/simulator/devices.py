"""Device type profiles and the fleet catalog (ids, names, sites)."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

DeviceType = Literal["motor", "wind_turbine", "pump", "transformer"]

# Round-robin order used to build a fleet of any size.
TYPE_ORDER: tuple[DeviceType, ...] = ("motor", "wind_turbine", "pump", "transformer")


@dataclass(frozen=True, slots=True)
class DeviceProfile:
    ambient_c: float
    temp_rise_full_load_c: float
    vibration_nominal_mm_s: float
    pressure_nominal_bar: float
    current_nominal_a: float
    load_period_s: float


PROFILES: dict[DeviceType, DeviceProfile] = {
    "motor": DeviceProfile(24, 38, 1.6, 3.2, 48, 180),
    "wind_turbine": DeviceProfile(14, 42, 2.1, 2.6, 310, 420),
    "pump": DeviceProfile(22, 30, 1.9, 6.4, 36, 240),
    "transformer": DeviceProfile(26, 34, 0.6, 0.35, 520, 600),
}

# id prefix and user-facing (Turkish) label per type.
_PREFIX: dict[DeviceType, str] = {
    "motor": "mt",
    "wind_turbine": "wt",
    "pump": "pm",
    "transformer": "tr",
}
_LABEL: dict[DeviceType, str] = {
    "motor": "Motor",
    "wind_turbine": "Türbin",
    "pump": "Pompa",
    "transformer": "Trafo",
}
_SITE: dict[DeviceType, str] = {
    "motor": "Bursa Fabrika A",
    "wind_turbine": "Aliağa Rüzgar Santrali",
    "pump": "Kocaeli Fabrika B",
    "transformer": "İzmir Şebeke TM-3",
}


def slugify(text: str) -> str:
    """'İzmir Şebeke TM-3' -> 'izmir-sebeke-tm-3' (safe for MQTT topic levels)."""
    ascii_text = (
        unicodedata.normalize("NFKD", text.replace("\u0131", "i").replace("\u0130", "I"))
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


@dataclass(frozen=True, slots=True)
class Device:
    device_id: str
    name: str
    type: DeviceType
    site: str
    site_slug: str
    profile: DeviceProfile


def build_devices(count: int) -> list[Device]:
    """Build `count` devices, cycling through the four types (12 -> 3 of each)."""
    devices: list[Device] = []
    for i in range(count):
        device_type = TYPE_ORDER[i % len(TYPE_ORDER)]
        number = i // len(TYPE_ORDER) + 1
        prefix = _PREFIX[device_type]
        site = _SITE[device_type]
        devices.append(
            Device(
                device_id=f"{prefix}-{number:02d}",
                name=f"{_LABEL[device_type]} {prefix.upper()}-{number:02d}",
                type=device_type,
                site=site,
                site_slug=slugify(site),
                profile=PROFILES[device_type],
            )
        )
    return devices
