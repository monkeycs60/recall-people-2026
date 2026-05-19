#!/usr/bin/env python3
"""Seed Recall People through the Android UI so API extraction creates the data."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from urllib.parse import quote
from xml.etree import ElementTree


DEFAULT_PACKAGE = "com.monkeycs60.recallpeople2026"
DEFAULT_ACTIVITY = "com.monkeycs60.recallpeople2026/.MainActivity"
DEFAULT_SCHEME = "recall-people"


@dataclass(frozen=True)
class SeedContact:
    name: str
    note: str


SEED_CONTACTS = [
    SeedContact(
        name="Thomas Nguyen",
        note=(
            "I met Thomas Nguyen at a CTO breakfast for HR tech founders in London. "
            "He is the CTO of a growing people-ops startup and likes direct, practical follow-ups. "
            "He needs to finish an authentication refactor before next Friday and asked for two clean "
            "migration examples. He also climbs on Wednesday evenings."
        ),
    ),
    SeedContact(
        name="Nadia Benali",
        note=(
            "I met Nadia Benali at a photography opening in Brooklyn. "
            "She is an interior designer preparing to open her studio in June and is looking "
            "for a photographer to document the space. She talks a lot about Japanese design "
            "and responds best to warm, thoughtful messages."
        ),
    ),
    SeedContact(
        name="Romain Gauthier",
        note=(
            "Romain Gauthier is a history teacher. We met through Camille at a dinner in Paris. "
            "He is organizing a school trip to Lyon on May 22 and wants museum ideas that work "
            "well with teenagers. He plays badminton on Sundays."
        ),
    ),
    SeedContact(
        name="Sofia Garcia",
        note=(
            "Sofia Garcia works in music events. I met her during an acoustic showcase in Madrid. "
            "She is preparing an emerging-artists night on June 18 and is looking for an intimate "
            "venue in Paris. She loves traveling by train."
        ),
    ),
    SeedContact(
        name="Mehdi Kara",
        note=(
            "Mehdi Kara is a sports physiotherapist in Lyon. We met during a running meetup. "
            "He is coaching several runners for the September marathon and prefers talking about "
            "recovery rather than performance. Ask him about calf pain prevention."
        ),
    ),
    SeedContact(
        name="Clara Simon",
        note=(
            "Clara Simon is Pauline's cousin. I met her at a family lunch on Sunday. "
            "She is looking for a communications apprenticeship starting in September, loves film "
            "photography, and would appreciate two useful introductions in cultural agencies."
        ),
    ),
]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode != 0:
        details = result.stderr.strip() or result.stdout.strip() or f"exit code {result.returncode}"
        raise RuntimeError(f"{' '.join(cmd)} failed: {details}")
    return result


def adb(serial: str | None, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    cmd = ["adb"]
    if serial:
      cmd += ["-s", serial]
    cmd += list(args)
    return run(cmd, check=check)


def pick_serial(serial: str | None) -> str:
    if serial:
        return serial

    result = run(["adb", "devices"])
    devices = []
    for line in result.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            devices.append(parts[0])

    if not devices:
        raise RuntimeError("No Android emulator/device found by adb devices")
    if len(devices) > 1:
        raise RuntimeError(f"Multiple adb devices found; pass --serial. Devices: {', '.join(devices)}")
    return devices[0]


def adb_text(value: str) -> str:
    # `adb shell input text` treats spaces as separators. Keep seed names ASCII.
    return value.replace(" ", "%s").replace("&", "\\&")


def launch_app(serial: str, activity: str) -> None:
    adb(serial, "shell", "am", "start", "-W", "-n", activity)


def ui_has_text(root: ElementTree.Element, texts: set[str]) -> bool:
    for node in root.iter("node"):
        candidates = [
            node.attrib.get("text", ""),
            node.attrib.get("content-desc", ""),
        ]
        if any(candidate in texts for candidate in candidates if candidate):
            return True
    return False


def wait_for_text(serial: str, texts: set[str], *, timeout_seconds: float) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if ui_has_text(dump_ui(serial), texts):
            return
        time.sleep(0.5)
    raise RuntimeError(f"Expected UI text not found: {', '.join(sorted(texts))}")


def start_select_contact(
    serial: str,
    package: str,
    activity: str,
    scheme: str,
    note: str,
    *,
    skip_avatar_generation: bool,
) -> None:
    uri = f"{scheme}://select-contact?transcription={quote(note)}"
    if skip_avatar_generation:
        uri += "&skipAvatarGeneration=1"
    launch_app(serial, activity)
    time.sleep(2.0)
    adb(serial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", uri.replace("&", "\\&"), package)
    wait_for_text(serial, {"Select contact", "Who is this about?"}, timeout_seconds=12.0)


def tap(serial: str, x: int, y: int) -> None:
    adb(serial, "shell", "input", "tap", str(x), str(y))


def type_text(serial: str, text: str) -> None:
    adb(serial, "shell", "input", "text", adb_text(text))


def clear_focused_text(serial: str) -> None:
    adb(serial, "shell", "input", "keyevent", "KEYCODE_MOVE_END", check=False)
    for _ in range(80):
        adb(serial, "shell", "input", "keyevent", "KEYCODE_DEL", check=False)


def dump_ui(serial: str) -> ElementTree.Element:
    result = adb(serial, "exec-out", "uiautomator", "dump", "/dev/tty")
    xml_start = result.stdout.find("<?xml")
    xml_end = result.stdout.rfind("</hierarchy>")
    if xml_start < 0 or xml_end < 0:
        raise RuntimeError("Could not read Android UI hierarchy")
    return ElementTree.fromstring(result.stdout[xml_start : xml_end + len("</hierarchy>")])


def node_center(bounds: str) -> tuple[int, int]:
    match = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
    if not match:
        raise RuntimeError(f"Invalid UI bounds: {bounds}")
    left, top, right, bottom = [int(value) for value in match.groups()]
    return ((left + right) // 2, (top + bottom) // 2)


def find_clickable_node_center(root: ElementTree.Element, labels: set[str]) -> tuple[int, int] | None:
    normalized_labels = {label.lower() for label in labels}
    for node in root.iter("node"):
        if node.attrib.get("enabled") != "true" or node.attrib.get("clickable") != "true":
            continue
        candidates = [
            node.attrib.get("text", ""),
            node.attrib.get("content-desc", ""),
        ]
        if any(candidate.lower() in normalized_labels for candidate in candidates if candidate):
            bounds = node.attrib.get("bounds")
            if bounds:
                return node_center(bounds)
    return None


def tap_label(serial: str, labels: set[str], *, timeout_seconds: float = 8.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        center = find_clickable_node_center(dump_ui(serial), labels)
        if center:
            tap(serial, center[0], center[1])
            return
        time.sleep(0.5)
    raise RuntimeError(f"Could not find UI label: {', '.join(sorted(labels))}")


def tap_label_until_absent(
    serial: str,
    labels: set[str],
    *,
    timeout_seconds: float,
    retries: int = 3,
) -> None:
    deadline = time.time() + timeout_seconds
    for attempt in range(retries):
        while time.time() < deadline:
            root = dump_ui(serial)
            center = find_clickable_node_center(root, labels)
            if center:
                tap(serial, center[0], center[1])
                time.sleep(2.0)
                if not find_clickable_node_center(dump_ui(serial), labels):
                    return
                break
            time.sleep(0.5)
        if attempt == retries - 1:
            raise RuntimeError(f"UI label still visible after tapping: {', '.join(sorted(labels))}")


def create_contact_through_ui(
    serial: str,
    package: str,
    activity: str,
    scheme: str,
    contact: SeedContact,
    *,
    name_x: int,
    name_y: int,
    create_x: int,
    create_y: int,
    save_x: int,
    save_y: int,
    wait_review_seconds: float,
    wait_after_save_seconds: float,
    skip_avatar_generation: bool,
    dry_run: bool,
) -> None:
    print(f"-> {contact.name}", flush=True)
    if dry_run:
        print(contact.note, flush=True)
        return

    adb(serial, "shell", "am", "force-stop", package, check=False)
    time.sleep(1.0)
    start_select_contact(
        serial,
        package,
        activity,
        scheme,
        contact.note,
        skip_avatar_generation=skip_avatar_generation,
    )
    time.sleep(1.8)
    tap(serial, name_x, name_y)
    time.sleep(0.2)
    clear_focused_text(serial)
    time.sleep(0.2)
    type_text(serial, contact.name)
    time.sleep(1.0)
    tap_label(serial, {"Create", "Créer", "Crear", "Crea", "Erstellen"}, timeout_seconds=8.0)

    # Wait for extractInfo() and the review screen.
    tap_label_until_absent(
        serial,
        {"Save", "Enregistrer", "Guardar", "Salva", "Speichern"},
        timeout_seconds=wait_review_seconds,
    )

    # Wait for save, avatar generation startup, sync queueing, and notification scheduling.
    # The review UI can stay on "Saving..." longer than the DB write; starting the next
    # deep link from a fresh process is more reliable for repeat QA seeding.
    time.sleep(wait_after_save_seconds)
    adb(serial, "shell", "am", "force-stop", package, check=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create six realistic Recall People contacts through the app UI and backend extraction."
    )
    parser.add_argument("--serial", help="ADB serial, e.g. emulator-5554")
    parser.add_argument("--package", default=DEFAULT_PACKAGE)
    parser.add_argument("--activity", default=DEFAULT_ACTIVITY)
    parser.add_argument("--scheme", default=DEFAULT_SCHEME)
    parser.add_argument("--dry-run", action="store_true", help="Print contacts and notes without touching the emulator")
    parser.add_argument(
        "--skip-avatar-generation",
        action="store_true",
        help="Disable automatic avatar generation for seeded contacts. Default is to generate avatars.",
    )
    parser.add_argument("--name-x", type=int, default=410, help="X coordinate for the new-contact name input")
    parser.add_argument("--name-y", type=int, default=760, help="Y coordinate for the new-contact name input")
    parser.add_argument("--create-x", type=int, default=1220, help="X coordinate for the create-new-contact button")
    parser.add_argument("--create-y", type=int, default=760, help="Y coordinate for the create-new-contact button")
    parser.add_argument("--save-x", type=int, default=720, help="X coordinate for the review save button")
    parser.add_argument("--save-y", type=int, default=2860, help="Y coordinate for the review save button")
    parser.add_argument(
        "--wait-review-seconds",
        type=float,
        default=18.0,
        help="Seconds to wait for backend extraction and the review screen before tapping Save",
    )
    parser.add_argument(
        "--wait-after-save-seconds",
        type=float,
        default=35.0,
        help="Seconds to wait after tapping Save before creating the next contact",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated contact names to create, e.g. 'Thomas Nguyen,Romain Gauthier'",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        serial = pick_serial(args.serial)
        print(f"Using device: {serial}", flush=True)
        print("The app must already be installed, running, logged in, and past language onboarding.", flush=True)
        requested_names = {
            name.strip().lower()
            for name in (args.only or "").split(",")
            if name.strip()
        }
        contacts = [
            contact
            for contact in SEED_CONTACTS
            if not requested_names or contact.name.lower() in requested_names
        ]
        if requested_names and len(contacts) != len(requested_names):
            found_names = {contact.name.lower() for contact in contacts}
            missing_names = sorted(requested_names - found_names)
            raise RuntimeError(f"Unknown --only contacts: {', '.join(missing_names)}")

        for contact in contacts:
            create_contact_through_ui(
                serial,
                args.package,
                args.activity,
                args.scheme,
                contact,
                name_x=args.name_x,
                name_y=args.name_y,
                create_x=args.create_x,
                create_y=args.create_y,
                save_x=args.save_x,
                save_y=args.save_y,
                wait_review_seconds=args.wait_review_seconds,
                wait_after_save_seconds=args.wait_after_save_seconds,
                skip_avatar_generation=args.skip_avatar_generation,
                dry_run=args.dry_run,
            )
        print("Done. Data was created through the app review flow, not by writing SQLite directly.", flush=True)
        return 0
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
