#!/usr/bin/env python3
"""Seed Recall People from a pasted contact/notes text file through the app UI."""

from __future__ import annotations

import argparse
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree

from seed_recall_people import (
    DEFAULT_ACTIVITY,
    DEFAULT_PACKAGE,
    DEFAULT_SCHEME,
    SeedContact,
    adb,
    clear_focused_text,
    dump_ui,
    pick_serial,
    start_select_contact,
    tap,
    tap_label,
    tap_label_until_absent,
    type_text,
)


@dataclass(frozen=True)
class ContactNotes:
    name: str
    notes: list[str]


CONTACT_HEADER_RE = re.compile(r"^\s*\d+\.\s+(.+?)\s+(?:\u2014|-)\s+.+$")
NOTE_HEADER_RE = re.compile(r"^\s*Note\s+\d+\s*$", re.IGNORECASE)


def normalize_note_line(line: str) -> str:
    return line.strip().lstrip("\u258e").strip()


def parse_notes_file(path: Path) -> list[ContactNotes]:
    contacts: list[ContactNotes] = []
    current_name: str | None = None
    current_notes: list[str] = []
    current_note_lines: list[str] = []

    def flush_note() -> None:
        nonlocal current_note_lines
        if current_note_lines:
            note = " ".join(current_note_lines).strip()
            note = re.sub(r"\s+", " ", note)
            if note:
                current_notes.append(note)
        current_note_lines = []

    def flush_contact() -> None:
        nonlocal current_name, current_notes
        flush_note()
        if current_name:
            if not current_notes:
                raise RuntimeError(f"No notes found for {current_name}")
            contacts.append(ContactNotes(name=current_name, notes=current_notes))
        current_name = None
        current_notes = []

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        header = CONTACT_HEADER_RE.match(line)
        if header:
            flush_contact()
            current_name = header.group(1).strip()
            continue

        if NOTE_HEADER_RE.match(line):
            flush_note()
            continue

        cleaned = normalize_note_line(line)
        if not cleaned or cleaned.startswith("---") or cleaned.startswith("Voici "):
            continue
        if cleaned.startswith("Aujourd'hui") or cleaned.startswith("▎"):
            continue
        if current_name and not cleaned.startswith(("1.", "2.", "3.", "4.", "5.", "6.")):
            current_note_lines.append(cleaned)

    flush_contact()

    if not contacts:
        raise RuntimeError(f"No contacts parsed from {path}")

    return contacts


def node_text(node: ElementTree.Element) -> str:
    return node.attrib.get("text") or node.attrib.get("content-desc") or ""


def node_bounds_center(node: ElementTree.Element) -> tuple[int, int] | None:
    bounds = node.attrib.get("bounds")
    if not bounds:
        return None
    match = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds)
    if not match:
        return None
    left, top, right, bottom = [int(value) for value in match.groups()]
    return ((left + right) // 2, (top + bottom) // 2)


def find_text_center(
    root: ElementTree.Element,
    labels: set[str],
    *,
    exact: bool,
) -> tuple[int, int] | None:
    normalized = {label.lower() for label in labels}
    for node in root.iter("node"):
        text = node_text(node).strip()
        if not text or node.attrib.get("enabled") != "true":
            continue
        text_lower = text.lower()
        matched = text_lower in normalized if exact else any(label in text_lower for label in normalized)
        if matched:
            center = node_bounds_center(node)
            if center:
                return center
    return None


def tap_text(
    serial: str,
    labels: set[str],
    *,
    timeout_seconds: float = 8.0,
    exact: bool = True,
) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        center = find_text_center(dump_ui(serial), labels, exact=exact)
        if center:
            tap(serial, center[0], center[1])
            return
        time.sleep(0.5)
    raise RuntimeError(f"Could not find UI text: {', '.join(sorted(labels))}")


def tap_non_input_text(
    serial: str,
    labels: set[str],
    *,
    timeout_seconds: float = 8.0,
    exact: bool = True,
) -> None:
    normalized = {label.lower() for label in labels}
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        root = dump_ui(serial)
        for node in root.iter("node"):
            if node.attrib.get("class") == "android.widget.EditText":
                continue
            text = node_text(node).strip()
            if not text or node.attrib.get("enabled") != "true":
                continue
            text_lower = text.lower()
            matched = text_lower in normalized if exact else any(label in text_lower for label in normalized)
            if matched:
                center = node_bounds_center(node)
                if center:
                    tap(serial, center[0], center[1])
                    return
        time.sleep(0.5)
    raise RuntimeError(f"Could not find non-input UI text: {', '.join(sorted(labels))}")


def ui_contains_text(serial: str, labels: set[str], *, exact: bool) -> bool:
    return find_text_center(dump_ui(serial), labels, exact=exact) is not None


def ui_contains_any_text(serial: str, fragments: set[str]) -> bool:
    try:
        return find_text_center(dump_ui(serial), fragments, exact=False) is not None
    except Exception:
        return False


def tap_save(serial: str, *, timeout_seconds: float) -> None:
    labels = {"Save", "Enregistrer", "Guardar", "Salva", "Speichern"}
    try:
        tap_label_until_absent(serial, labels, timeout_seconds=timeout_seconds)
        return
    except Exception:
        pass

    deadline = time.time() + timeout_seconds
    for _ in range(4):
        while time.time() < deadline:
            center = find_text_center(dump_ui(serial), labels, exact=True)
            if center:
                tap(serial, center[0], center[1])
                time.sleep(2.0)
                if not ui_contains_text(serial, labels, exact=True):
                    return
                break
            time.sleep(0.5)
    raise RuntimeError("Could not tap Save on the review screen")


def create_new_contact(
    serial: str,
    contact: SeedContact,
    *,
    name_x: int,
    name_y: int,
) -> None:
    tap(serial, name_x, name_y)
    time.sleep(0.2)
    clear_focused_text(serial)
    time.sleep(0.2)
    type_text(serial, contact.name)
    time.sleep(1.0)
    tap_label(
        serial,
        {
            "Create",
            "Create contact",
            "Créer",
            "Créer le contact",
            "Crear",
            "Crear contacto",
            "Crea",
            "Crea contatto",
            "Erstellen",
            "Kontakt erstellen",
        },
        timeout_seconds=8.0,
    )


def select_existing_contact(
    serial: str,
    name: str,
    *,
    search_x: int,
    search_y: int,
) -> None:
    first_name = name.split()[0]

    try:
        tap_text(serial, {f"Add this note to {first_name}"}, timeout_seconds=2.0, exact=False)
        return
    except Exception:
        pass

    try:
        tap_text(
            serial,
            {
                "Search for a contact...",
                "Rechercher un contact...",
                "Buscar un contacto...",
                "Cerca un contatto...",
                "Kontakt suchen...",
            },
            timeout_seconds=2.0,
        )
    except Exception:
        tap(serial, search_x, search_y)

    time.sleep(0.2)
    clear_focused_text(serial)
    time.sleep(0.2)
    type_text(serial, name)
    time.sleep(1.2)
    tap_non_input_text(serial, {name}, timeout_seconds=12.0)


def add_note_through_ui(
    serial: str,
    package: str,
    activity: str,
    scheme: str,
    contact: SeedContact,
    *,
    create: bool,
    name_x: int,
    name_y: int,
    search_x: int,
    search_y: int,
    wait_review_seconds: float,
    wait_after_save_seconds: float,
    wait_before_note_seconds: float,
    skip_avatar_generation: bool,
    append_via_create_name: bool,
    max_attempts: int,
    retry_cooldown_seconds: float,
    dry_run: bool,
) -> None:
    action = "create" if create else ("upsert" if append_via_create_name else "append")
    print(f"-> {contact.name} [{action}]", flush=True)
    if dry_run:
        print(contact.note, flush=True)
        return

    if wait_before_note_seconds > 0:
        time.sleep(wait_before_note_seconds)

    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        if attempt > 1:
            print(f"   retry {attempt}/{max_attempts} after cooldown", flush=True)
            time.sleep(retry_cooldown_seconds)

        try:
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

            if create or append_via_create_name:
                create_new_contact(serial, contact, name_x=name_x, name_y=name_y)
            else:
                select_existing_contact(serial, contact.name, search_x=search_x, search_y=search_y)

            tap_save(serial, timeout_seconds=wait_review_seconds)
            time.sleep(wait_after_save_seconds)
            adb(serial, "shell", "am", "force-stop", package, check=False)
            return
        except Exception as error:
            last_error = error
            rate_limited = ui_contains_any_text(serial, {"too many requests", "extraction failed"})
            transient_start_failure = "Expected UI text not found" in str(error)
            adb(serial, "shell", "am", "force-stop", package, check=False)
            if attempt < max_attempts and (rate_limited or transient_start_failure):
                continue
            raise

    if last_error:
        raise last_error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create contacts and multiple notes through the Recall People UI from a pasted text file."
    )
    parser.add_argument("notes_file", type=Path)
    parser.add_argument("--serial", help="ADB serial, e.g. emulator-5554")
    parser.add_argument("--package", default=DEFAULT_PACKAGE)
    parser.add_argument("--activity", default=DEFAULT_ACTIVITY)
    parser.add_argument("--scheme", default=DEFAULT_SCHEME)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-avatar-generation", action="store_true")
    parser.add_argument("--name-x", type=int, default=410)
    parser.add_argument("--name-y", type=int, default=900)
    parser.add_argument("--search-x", type=int, default=360)
    parser.add_argument("--search-y", type=int, default=1515)
    parser.add_argument("--wait-review-seconds", type=float, default=30.0)
    parser.add_argument("--wait-after-create-save-seconds", type=float, default=35.0)
    parser.add_argument("--wait-after-append-save-seconds", type=float, default=10.0)
    parser.add_argument("--wait-before-note-seconds", type=float, default=0.0)
    parser.add_argument("--max-attempts", type=int, default=1)
    parser.add_argument("--retry-cooldown-seconds", type=float, default=90.0)
    parser.add_argument(
        "--skip-first-note",
        action="store_true",
        help="Skip note 1 for each selected contact; useful when resuming after the contact was already created.",
    )
    parser.add_argument("--start-note-number", type=int, default=1)
    parser.add_argument("--end-note-number", type=int)
    parser.add_argument(
        "--append-via-create-name",
        action="store_true",
        help="For note 2+ type the contact name and press Create contact; the app reuses existing contacts by name.",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated contact names to seed, e.g. 'Daniel Okafor,Sophie Bennett'",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        serial = pick_serial(args.serial)
        contacts = parse_notes_file(args.notes_file)
        requested_names = {
            name.strip().lower()
            for name in (args.only or "").split(",")
            if name.strip()
        }
        if requested_names:
            contacts = [contact for contact in contacts if contact.name.lower() in requested_names]
            found_names = {contact.name.lower() for contact in contacts}
            missing_names = sorted(requested_names - found_names)
            if missing_names:
                raise RuntimeError(f"Unknown --only contacts: {', '.join(missing_names)}")

        total_notes = sum(len(contact.notes) for contact in contacts)
        print(f"Using device: {serial}", flush=True)
        print(f"Parsed {len(contacts)} contacts and {total_notes} notes from {args.notes_file}", flush=True)
        print("The app must already be installed, running, logged in, and past language onboarding.", flush=True)

        for contact_notes in contacts:
            for index, note in enumerate(contact_notes.notes):
                note_number = index + 1
                if args.skip_first_note and index == 0:
                    print(f"-> {contact_notes.name} [skip first note]", flush=True)
                    continue
                if note_number < args.start_note_number:
                    print(f"-> {contact_notes.name} [skip note {note_number}]", flush=True)
                    continue
                if args.end_note_number and note_number > args.end_note_number:
                    print(f"-> {contact_notes.name} [skip note {note_number}]", flush=True)
                    continue
                add_note_through_ui(
                    serial,
                    args.package,
                    args.activity,
                    args.scheme,
                    SeedContact(name=contact_notes.name, note=note),
                    create=index == 0,
                    name_x=args.name_x,
                    name_y=args.name_y,
                    search_x=args.search_x,
                    search_y=args.search_y,
                    wait_review_seconds=args.wait_review_seconds,
                    wait_after_save_seconds=(
                        args.wait_after_create_save_seconds
                        if index == 0
                        else args.wait_after_append_save_seconds
                    ),
                    wait_before_note_seconds=args.wait_before_note_seconds,
                    skip_avatar_generation=args.skip_avatar_generation,
                    append_via_create_name=args.append_via_create_name,
                    max_attempts=args.max_attempts,
                    retry_cooldown_seconds=args.retry_cooldown_seconds,
                    dry_run=args.dry_run,
                )

        print("Done. Data was created through the app review flow, not by writing SQLite directly.", flush=True)
        return 0
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
