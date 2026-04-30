#!/usr/bin/env python3
"""Seed the Recall People Android app SQLite DB on a running emulator."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path


DEFAULT_PACKAGE = "com.monkeycs60.recallpeople2026"
DEFAULT_DB_NAME = "recall_people.db"
APP_DB_DIR = "files/SQLite"
DEFAULT_BACKUP_DIR = Path("/tmp/recall-people-seed-backups")


GROUPS = [
    ("seed-group-famille", "Famille"),
    ("seed-group-amis", "Amis proches"),
    ("seed-group-travail", "Travail"),
    ("seed-group-startup", "Ecosysteme startup"),
    ("seed-group-running", "Running"),
    ("seed-group-creative", "Creatifs"),
    ("seed-group-voyage", "Voyage"),
    ("seed-group-paris", "Paris"),
]


PEOPLE = [
    ("Camille", "Roux", "Cam", "female", "ami", ["seed-group-amis", "seed-group-paris"], "product manager fintech", "transfert equipe et semi-marathon", "running", "Paris", (14, 3, 1992), 4),
    ("Lucas", "Moreau", None, "male", "collegue", ["seed-group-travail", "seed-group-startup"], "lead data", "recrutement data engineer senior", "prise de parole", "Paris", (2, 11, 1988), 12),
    ("Nadia", "Benali", "Nad", "female", "ami", ["seed-group-amis", "seed-group-creative"], "architecte interieur", "ouverture atelier Montreuil", "expositions photo", "Montreuil", (27, 7, 1990), 2),
    ("Antoine", "Lefevre", "Tonio", "male", "famille", ["seed-group-famille"], "chef de chantier", "renovation maison a Tours", "bricolage", "Tours", (9, 5, 1985), 20),
    ("Sofia", "Garcia", None, "female", "connaissance", ["seed-group-voyage", "seed-group-paris"], "evenementiel musical", "showcase acoustique", "voyages Madrid", "Madrid", (18, 9, 1995), 8),
    ("Mehdi", "Kara", None, "male", "ami", ["seed-group-amis", "seed-group-running"], "kine", "preparation marathon", "recuperation sportive", "Lyon", (5, 12, 1991), 15),
    ("Emma", "Petit", "Em", "female", "collegue", ["seed-group-travail", "seed-group-creative"], "designer produit", "audit UX", "typographie", "Paris", (22, 1, 1993), 6),
    ("Thomas", "Nguyen", None, "male", "collegue", ["seed-group-travail", "seed-group-startup"], "CTO startup RH", "refactor auth", "escalade", "Paris", (30, 6, 1987), 1),
    ("Leila", "Haddad", None, "female", "ami", ["seed-group-amis", "seed-group-voyage"], "journaliste climat", "reportage Bretagne", "romans contemporains", "Rennes", (11, 4, 1989), 30),
    ("Julien", "Bernard", "Jules", "male", "ami", ["seed-group-amis", "seed-group-running"], "consultant independant", "mission locale", "trail et cuisine italienne", "Nantes", (16, 8, 1984), 5),
    ("Clara", "Simon", None, "female", "famille", ["seed-group-famille", "seed-group-creative"], "etudiante communication", "recherche alternance", "photo argentique", "Lyon", (3, 2, 1998), 18),
    ("Hugo", "Martin", None, "male", "connaissance", ["seed-group-startup", "seed-group-paris"], "fondateur SaaS", "levee seed", "produit B2B", "Paris", (25, 10, 1994), 40),
    ("Ines", "Aubert", None, "female", "ami", ["seed-group-amis", "seed-group-creative"], "cheffe patissiere", "nouvelle carte ete", "marches du dimanche", "Paris", (7, 1, 1991), 9),
    ("Olivier", "Durand", "Olive", "male", "collegue", ["seed-group-travail"], "responsable partenariats", "deplacement Bruxelles", "tennis", "Lille", (19, 12, 1982), 11),
    ("Maya", "Cohen", None, "female", "connaissance", ["seed-group-startup", "seed-group-voyage"], "VC associate", "comite investissement IA ops", "decks synthetiques", "Tel Aviv", (29, 5, 1996), 22),
    ("Romain", "Gauthier", None, "male", "ami", ["seed-group-amis", "seed-group-running"], "prof histoire", "voyage scolaire", "badminton", "Paris", (13, 6, 1986), 3),
    ("Elise", "Fournier", None, "female", "collegue", ["seed-group-travail", "seed-group-paris"], "customer success", "client sensible", "formation negotiation", "Paris", (21, 9, 1992), 14),
    ("Karim", "Diallo", None, "male", "ami", ["seed-group-amis", "seed-group-creative"], "monteur video", "documentaire court", "materiel camera", "Marseille", (4, 4, 1990), 25),
    ("Sarah", "Lambert", "Sare", "female", "famille", ["seed-group-famille"], "libraire", "rencontre auteur", "cadeaux utiles", "Bordeaux", (8, 8, 1983), 17),
    ("Baptiste", "Renard", "Bap", "male", "connaissance", ["seed-group-startup", "seed-group-paris"], "avocat corporate", "closing deal SaaS", "BSPCE", "Paris", (20, 2, 1989), 45),
    ("Anais", "Robert", None, "female", "ami", ["seed-group-amis", "seed-group-voyage"], "infirmiere", "voyage Japon", "carnets papier", "Strasbourg", (17, 11, 1997), 7),
    ("Maxime", "Philippe", "Max", "male", "collegue", ["seed-group-travail", "seed-group-running"], "backend engineer", "optimisation file de jobs", "benchmarks", "Paris", (1, 7, 1991), 10),
    ("Marine", "Collet", None, "female", "connaissance", ["seed-group-creative", "seed-group-paris"], "galeriste", "accrochage contemporain", "artistes emergents", "Paris", (12, 12, 1987), 28),
    ("Yanis", "Bourgeois", None, "male", "ami", ["seed-group-amis", "seed-group-startup"], "growth marketer", "campagnes LinkedIn", "espagnol", "Paris", (6, 10, 1993), 13),
    ("Pauline", "Mercier", "Pau", "female", "famille", ["seed-group-famille", "seed-group-voyage"], "professionnelle du vin", "degustation familiale", "domaines bordelais", "Bordeaux", (24, 6, 1985), 32),
    ("Etienne", "Lemoine", None, "male", "collegue", ["seed-group-travail"], "CFO", "audit fournisseur", "points courts matin", "Paris", (28, 1, 1981), 19),
    ("Lina", "Schmitt", None, "female", "ami", ["seed-group-amis", "seed-group-creative", "seed-group-paris"], "illustratrice", "couverture jeunesse", "ateliers mercredi", "Paris", (15, 5, 1994), 16),
    ("Victor", "Perrin", None, "male", "connaissance", ["seed-group-running", "seed-group-paris"], "cardiologue du sport", "conference prevention", "cafes tranquilles", "Paris", (10, 3, 1986), 35),
    ("Alicia", "Morel", None, "female", "collegue", ["seed-group-travail", "seed-group-startup"], "legal ops", "migration contrats", "checklists", "Paris", (26, 8, 1990), 21),
    ("Gabriel", "Noel", "Gaby", "male", "ami", ["seed-group-amis", "seed-group-voyage"], "guide haute montagne", "sortie Ecrins", "meteo montagne", "Grenoble", (31, 12, 1988), 23),
]


NOTE_TEMPLATES = [
    "Dernier echange fluide. Prefere les messages courts, les options concretes et les suivis sans trop de formalite.",
    "Conversation orientee projets. A mentionne une priorite du mois et une contrainte calendrier importante.",
    "Nouvelles personnelles a garder. Penser a demander des nouvelles de la famille, du travail et du sujet principal.",
]


def build_followups(first: str, project: str, hobby: str) -> list[tuple[str, str, int]]:
    return [
        (f"Point {project}", f"Revenir sur {project} et noter la prochaine action utile.", 5),
        (f"Voir {first}", "Proposer deux creneaux simples pour se croiser sans trop formaliser.", 11),
        (f"Ressource {hobby}", f"Envoyer une ressource ou une idee liee a {hobby}.", 17),
        (f"Decision {project}", f"Demander ce qui a ete decide sur {project}.", 23),
        (f"Intro pour {first}", "Envoyer l introduction ou le contact promis pendant l echange.", 29),
    ]


def build_summary(first: str, last: str, suffix: str, city: str, job: str, project: str, hobby: str, relationship: str) -> str:
    return (
        f"{first} {last}{suffix} vit a {city} et travaille comme {job}. "
        f"Le sujet a suivre est {project}; mieux vaut proposer des options concretes et revenir avec un point clair. "
        f"Conversation facile autour de {hobby}; relation: {relationship}."
    )


def build_questions(first: str, project: str, hobby: str) -> list[str]:
    return [
        f"Qu est-ce que ca a donne, {project} ?",
        f"Tu as eu du nouveau cote {hobby} ?",
        f"Quel serait le bon moment pour se voir, {first} ?",
    ]


def run(cmd: list[str], *, check: bool = True, capture: bool = True, input_bytes: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(
        cmd,
        input=input_bytes,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )
    if check and result.returncode != 0:
        stderr = (result.stderr or b"").decode(errors="replace").strip()
        stdout = (result.stdout or b"").decode(errors="replace").strip()
        details = stderr or stdout or f"exit code {result.returncode}"
        raise RuntimeError(f"{' '.join(cmd)} failed: {details}")
    return result


def adb(serial: str | None, *args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
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
    for line in result.stdout.decode().splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            devices.append(parts[0])
    if not devices:
        raise RuntimeError("No running Android emulator/device found by adb devices")
    if len(devices) > 1:
        raise RuntimeError(f"Multiple adb devices found; pass --serial. Devices: {', '.join(devices)}")
    return devices[0]


def app_db_path(db_name: str) -> str:
    return f"{APP_DB_DIR}/{db_name}"


def pull_app_file(serial: str, package: str, remote_path: str, local_path: Path) -> bool:
    result = adb(serial, "exec-out", "run-as", package, "cat", remote_path, check=False)
    if result.returncode != 0 or not result.stdout:
        return False
    local_path.write_bytes(result.stdout)
    return True


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT,
          nickname TEXT,
          gender TEXT DEFAULT 'unknown',
          phone TEXT,
          email TEXT,
          birthday_day INTEGER,
          birthday_month INTEGER,
          birthday_year INTEGER,
          relationship_type TEXT DEFAULT 'connaissance',
          photo_uri TEXT,
          avatar_url TEXT,
          ai_summary TEXT,
          suggested_questions TEXT,
          last_contact_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          highlights TEXT DEFAULT '[]',
          reminder_frequency_days INTEGER
        );

        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          title TEXT,
          transcription TEXT NOT NULL,
          audio_uri TEXT,
          audio_duration_ms INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS hot_topics (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          title TEXT NOT NULL,
          context TEXT,
          event_date TEXT,
          status TEXT DEFAULT 'active',
          resolution TEXT,
          resolved_at TEXT,
          source_note_id TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          notified_at TEXT,
          birthday_contact_id TEXT,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS contact_groups (
          contact_id TEXT NOT NULL,
          group_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (contact_id, group_id),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS migration_markers (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
        CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
        CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
        CREATE INDEX IF NOT EXISTS idx_hot_topics_event_date ON hot_topics(event_date);
        CREATE INDEX IF NOT EXISTS idx_hot_topics_birthday ON hot_topics(birthday_contact_id);
        CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
        CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);

        INSERT OR REPLACE INTO migration_markers (key, value)
        VALUES ('v2_migration_completed', 'true');
        """
    )


def delete_old_seed(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM hot_topics WHERE contact_id LIKE 'seed-%' OR id LIKE 'seed-%'")
    conn.execute("DELETE FROM notes WHERE contact_id LIKE 'seed-%' OR id LIKE 'seed-%'")
    conn.execute("DELETE FROM contact_groups WHERE contact_id LIKE 'seed-%'")
    conn.execute("DELETE FROM contacts WHERE id LIKE 'seed-%'")
    conn.execute("DELETE FROM groups WHERE id LIKE 'seed-group-%'")


def seed_database(db_path: Path, count: int, replace_seed: bool) -> dict[str, int]:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    ensure_schema(conn)
    if replace_seed:
        delete_old_seed(conn)

    now = datetime.now().replace(microsecond=0)
    cur = conn.cursor()

    for group_id, group_name in GROUPS:
        cur.execute(
            "INSERT OR REPLACE INTO groups (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (group_id, group_name, now.isoformat(), now.isoformat()),
        )

    for index in range(1, count + 1):
        person = PEOPLE[(index - 1) % len(PEOPLE)]
        (
            first,
            last,
            nick,
            gender,
            relationship,
            person_groups,
            job,
            project,
            hobby,
            city,
            birthday,
            days_since_contact,
        ) = person
        suffix = "" if index <= len(PEOPLE) else f" {index}"
        contact_id = f"seed-contacts-{index:03d}"
        created_at = now + timedelta(seconds=index)
        last_contact_at = now - timedelta(days=days_since_contact + (index // len(PEOPLE)))
        summary = build_summary(first, last, suffix, city, job, project, hobby, relationship)
        questions = build_questions(first, project, hobby)
        cur.execute(
            """
            INSERT OR REPLACE INTO contacts (
              id, first_name, last_name, nickname, gender, phone, email,
              birthday_day, birthday_month, birthday_year, relationship_type,
              ai_summary, suggested_questions, last_contact_at, created_at, updated_at,
              reminder_frequency_days, highlights
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                contact_id,
                first,
                f"{last}{suffix}",
                nick,
                gender,
                f"+3361200{index:04d}",
                f"{first.lower()}.{last.lower()}.{index:03d}@example.com",
                birthday[0],
                birthday[1],
                birthday[2],
                relationship,
                summary,
                json.dumps(questions, ensure_ascii=False),
                last_contact_at.isoformat(),
                created_at.isoformat(),
                created_at.isoformat(),
                [14, 21, 30, 45][index % 4],
                "[]",
            ),
        )

        for group_id in person_groups:
            cur.execute(
                "INSERT OR IGNORE INTO contact_groups (contact_id, group_id, created_at) VALUES (?, ?, ?)",
                (contact_id, group_id, created_at.isoformat()),
            )

        for note_index, template in enumerate(NOTE_TEMPLATES, 1):
            note_date = last_contact_at - timedelta(days=(note_index - 1) * 12)
            transcription = (
                f"{first} {last}{suffix}. {template} Details memorises: {summary}. "
                f"Questions utiles: {' / '.join(questions)}"
            )
            cur.execute(
                """
                INSERT OR REPLACE INTO notes
                  (id, contact_id, title, transcription, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    f"{contact_id}-note-{note_index:02d}",
                    contact_id,
                    ["Dernieres nouvelles", "Point projets", "Infos perso"][note_index - 1],
                    transcription,
                    note_date.isoformat(),
                    note_date.isoformat(),
                ),
            )

        special_events = [
            (f"Suivi {project}", f"Demander a {first} ou en est {project} et noter la prochaine action.", 7 + (index % 8)),
            (f"News {hobby}", f"Faire un suivi naturel sur {hobby}, sans transformer ca en checklist froide.", 14 + (index % 10)),
        ]
        for event_index, (title, context, offset) in enumerate(special_events, 1):
            event_created_at = created_at + timedelta(minutes=event_index)
            cur.execute(
                """
                INSERT OR REPLACE INTO hot_topics
                  (id, contact_id, title, context, event_date, status, source_note_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (
                    f"{contact_id}-event-special-{event_index:02d}",
                    contact_id,
                    title,
                    context,
                    (now + timedelta(days=offset)).date().isoformat(),
                    f"{contact_id}-note-01",
                    event_created_at.isoformat(),
                    event_created_at.isoformat(),
                ),
            )

        for event_index, (title, context, offset) in enumerate(build_followups(first, project, hobby), 1):
            event_created_at = created_at + timedelta(minutes=10 + event_index)
            cur.execute(
                """
                INSERT OR REPLACE INTO hot_topics
                  (id, contact_id, title, context, event_date, status, source_note_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (
                    f"{contact_id}-event-follow-{event_index:02d}",
                    contact_id,
                    title,
                    context,
                    (now + timedelta(days=offset + (index % 6) * 2)).date().isoformat(),
                    f"{contact_id}-note-02",
                    event_created_at.isoformat(),
                    event_created_at.isoformat(),
                ),
            )

        if index % 3 == 0:
            resolved_at = now - timedelta(days=index)
            cur.execute(
                """
                INSERT OR REPLACE INTO hot_topics
                  (id, contact_id, title, context, event_date, status, resolution, resolved_at, source_note_id, created_at, updated_at)
                VALUES (?, ?, 'Point termine', 'Ancien point garde pour historique.', ?, 'resolved',
                  'Decision confirmee et prochaine action notee.', ?, ?, ?, ?)
                """,
                (
                    f"{contact_id}-event-resolved-01",
                    contact_id,
                    (now - timedelta(days=index + 2)).date().isoformat(),
                    resolved_at.isoformat(),
                    f"{contact_id}-note-03",
                    resolved_at.isoformat(),
                    resolved_at.isoformat(),
                ),
            )

    conn.commit()
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise RuntimeError(f"SQLite integrity check failed: {integrity}")
    counts = {
        table: conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        for table in ["contacts", "notes", "hot_topics", "groups", "contact_groups"]
    }
    conn.execute("PRAGMA wal_checkpoint(FULL)")
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.close()

    for suffix in ("-wal", "-shm"):
        sidecar = db_path.with_name(db_path.name + suffix)
        if sidecar.exists():
            sidecar.unlink()

    return counts


def resolve_activity(serial: str, package: str) -> str | None:
    result = adb(serial, "shell", "cmd", "package", "resolve-activity", "--brief", package, check=False)
    if result.returncode != 0:
        return None
    lines = [line.strip() for line in result.stdout.decode().splitlines() if line.strip()]
    for line in reversed(lines):
        if "/" in line and not line.startswith("priority="):
            return line
    return None


def verify_pushed_db(serial: str, package: str, db_name: str, tmp_dir: Path) -> dict[str, int]:
    after_db = tmp_dir / "after_push.db"
    if not pull_app_file(serial, package, app_db_path(db_name), after_db):
        raise RuntimeError("Could not pull DB after push for verification")
    conn = sqlite3.connect(after_db)
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise RuntimeError(f"Pushed SQLite integrity check failed: {integrity}")
    counts = {
        table: conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        for table in ["contacts", "notes", "hot_topics", "groups", "contact_groups"]
    }
    conn.close()
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", help="ADB serial. Defaults to the only device from adb devices.")
    parser.add_argument("--package", default=DEFAULT_PACKAGE, help=f"Android package. Default: {DEFAULT_PACKAGE}")
    parser.add_argument("--db-name", default=DEFAULT_DB_NAME, help=f"SQLite DB name. Default: {DEFAULT_DB_NAME}")
    parser.add_argument("--count", type=int, default=30, help="Number of synthetic contacts to seed.")
    parser.add_argument("--keep-old-seed", action="store_true", help="Do not delete existing synthetic seed-%% rows before inserting.")
    parser.add_argument("--no-launch", action="store_true", help="Do not relaunch the app after pushing the DB.")
    parser.add_argument("--keep-temp", action="store_true", help="Keep the temporary backup directory.")
    parser.add_argument("--backup-dir", help="Directory for persistent pre-seed DB backups. Default: /tmp/recall-people-seed-backups")
    args = parser.parse_args()

    if args.count < 1:
        raise SystemExit("--count must be >= 1")

    serial = pick_serial(args.serial)
    tmp_root = Path(tempfile.mkdtemp(prefix="recall-people-seed-"))
    db_path = tmp_root / args.db_name

    try:
        print(f"[seed] serial={serial} package={args.package} count={args.count}")
        adb(serial, "shell", "am", "force-stop", args.package)

        remote_db = app_db_path(args.db_name)
        pulled = pull_app_file(serial, args.package, remote_db, db_path)
        if pulled:
            for suffix in ("-wal", "-shm"):
                pull_app_file(serial, args.package, remote_db + suffix, tmp_root / (args.db_name + suffix))
            backup_dir = Path(args.backup_dir) if args.backup_dir else DEFAULT_BACKUP_DIR
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup_path = backup_dir / f"{args.db_name}.backup-{stamp}.db"
            shutil.copy2(db_path, backup_path)
            print(f"[seed] backed up app DB to {backup_path}")
        else:
            print("[seed] app DB not found or empty; creating a fresh DB")

        counts = seed_database(db_path, args.count, replace_seed=not args.keep_old_seed)
        print("[seed] local DB counts:", counts)

        tmp_remote = f"/data/local/tmp/{args.db_name}.seeded"
        adb(serial, "push", str(db_path), tmp_remote)
        adb(serial, "shell", "chmod", "644", tmp_remote)
        adb(serial, "shell", "run-as", args.package, "mkdir", "-p", APP_DB_DIR)
        adb(serial, "shell", "run-as", args.package, "cp", tmp_remote, remote_db)
        adb(serial, "shell", "run-as", args.package, "rm", "-f", remote_db + "-wal", remote_db + "-shm")

        pushed_counts = verify_pushed_db(serial, args.package, args.db_name, tmp_root)
        print("[seed] pushed DB counts:", pushed_counts)

        if not args.no_launch:
            activity = resolve_activity(serial, args.package)
            if activity:
                adb(serial, "shell", "am", "start", "-n", activity)
                print(f"[seed] launched {activity}")
            else:
                print("[seed] could not resolve launch activity; DB was still seeded")

        if args.keep_temp:
            print(f"[seed] temp kept at {tmp_root}")
        else:
            shutil.rmtree(tmp_root, ignore_errors=True)
        return 0
    except Exception as exc:
        print(f"[seed] ERROR: {exc}", file=sys.stderr)
        print(f"[seed] temp kept for debugging: {tmp_root}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
