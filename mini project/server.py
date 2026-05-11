import json
import os
import sqlite3
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, HTTPServer
import traceback
from urllib.parse import urlparse

DB_PATH = os.path.join(os.path.dirname(__file__), "events.db")


def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            location TEXT NOT NULL,
            is_online INTEGER NOT NULL DEFAULT 0,
            link TEXT DEFAULT '',
            seats INTEGER NOT NULL DEFAULT 100,
            registered INTEGER NOT NULL DEFAULT 0,
            tags TEXT DEFAULT '[]',
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT ''
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            registered_at INTEGER NOT NULL,
            UNIQUE(user_id, event_id)
        )
        """
    )

    admin_exists = cur.execute(
        "SELECT id FROM users WHERE email = ?", ("admin@eventsphere.local",)
    ).fetchone()
    if not admin_exists:
        cur.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            ("Admin", "admin@eventsphere.local", "admin123", "admin"),
        )

    events_count = cur.execute("SELECT COUNT(*) as c FROM events").fetchone()["c"]
    if events_count == 0:
        seed = [
            (
                "Tech Innovators Summit 2026",
                "Conference",
                "2026-03-18",
                "10:00",
                "Bengaluru · In-Person",
                0,
                "",
                220,
                164,
                json.dumps(["AI", "Cloud", "Startups"]),
                "A full-day summit bringing together founders, engineers, and operators.",
                "",
            ),
            (
                "Design Systems Deep-Dive",
                "Workshop",
                "2026-02-24",
                "16:30",
                "Online · Zoom",
                1,
                "https://example.com/design-systems",
                80,
                72,
                json.dumps(["UX", "React", "Design"]),
                "Hands-on workshop for building accessible design systems.",
                "",
            ),
            (
                "Startup Demo Night",
                "Meetup",
                "2026-02-20",
                "18:30",
                "Hyderabad · In-Person",
                0,
                "",
                150,
                129,
                json.dumps(["Pitch", "Networking"]),
                "Lightning demos from early-stage startups and networking.",
                "",
            ),
            (
                "Remote Collaboration Playbook",
                "Webinar",
                "2026-02-28",
                "19:00",
                "Online · Live",
                1,
                "https://example.com/remote-playbook",
                300,
                241,
                json.dumps(["Remote Work", "Teams"]),
                "Tactics and tools for high-performing remote teams.",
                "",
            ),
        ]
        cur.executemany(
            """
            INSERT INTO events
            (name, type, date, time, location, is_online, link, seats, registered, tags, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            seed,
        )

    conn.commit()
    conn.close()


def serialize_event(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "date": row["date"],
        "time": row["time"],
        "location": row["location"],
        "isOnline": bool(row["is_online"]),
        "link": row["link"] or "",
        "seats": row["seats"],
        "registered": row["registered"],
        "tags": json.loads(row["tags"] or "[]"),
        "description": row["description"] or "",
        "imageUrl": row["image_url"] or "",
    }


def list_events(conn):
    rows = conn.execute("SELECT * FROM events ORDER BY date, time").fetchall()
    return [serialize_event(r) for r in rows]


def list_registrations(conn, user_id):
    rows = conn.execute(
        "SELECT event_id, registered_at FROM registrations WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    return [
        {"eventId": row["event_id"], "registeredAt": row["registered_at"]} for row in rows
    ]


class Handler(SimpleHTTPRequestHandler):
    def log_error(self, format, *args):
        import sys
        print("ERROR:", format % args, file=sys.stderr)
    def log_message(self, format, *args):
        print("MSG:", format % args)

    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def _require_user(self, conn):
        raw = self.headers.get("X-User-Id")
        if not raw:
            return None
        try:
            user_id = int(raw)
        except ValueError:
            return None
        return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/events":
            conn = db_conn()
            data = {"events": list_events(conn)}
            conn.close()
            return self._json(200, data)
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        body = self._read_body()
        conn = db_conn()
        cur = conn.cursor()

        if parsed.path == "/api/auth/register":
            name = (body.get("name") or "").strip()
            email = (body.get("email") or "").strip().lower()
            password = (body.get("password") or "").strip()
            if not name or not email or not password:
                conn.close()
                return self._json(400, {"error": "Please fill all required fields."})
            exists = cur.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if exists:
                conn.close()
                return self._json(400, {"error": "Email already registered."})
            cur.execute(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
                (name, email, password),
            )
            conn.commit()
            user_id = cur.lastrowid
            conn.close()
            return self._json(
                201,
                {
                    "user": {
                        "id": user_id,
                        "name": name,
                        "email": email,
                        "role": "user",
                    }
                },
            )

        if parsed.path == "/api/auth/login":
            email = (body.get("email") or "").strip().lower()
            password = (body.get("password") or "").strip()
            as_admin = bool(body.get("asAdmin"))
            user_by_email = cur.execute(
                "SELECT * FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            if not user_by_email:
                conn.close()
                return self._json(404, {"error": "Account not found. Please register first."})
            if user_by_email["password"] != password:
                conn.close()
                return self._json(401, {"error": "Incorrect password."})
            user = user_by_email
            if as_admin and user["role"] != "admin":
                conn.close()
                return self._json(403, {"error": "This account is not an admin."})
            payload = {
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                },
                "events": list_events(conn),
                "registrations": list_registrations(conn, user["id"]),
            }
            conn.close()
            return self._json(200, payload)

        if parsed.path == "/api/events":
            user = self._require_user(conn)
            if not user or user["role"] != "admin":
                conn.close()
                return self._json(403, {"error": "Admin access required."})
            tags = body.get("tags") or []
            cur.execute(
                """
                INSERT INTO events
                (name, type, date, time, location, is_online, link, seats, registered, tags, description, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                """,
                (
                    body.get("name", "").strip(),
                    body.get("type", "Conference"),
                    body.get("date", ""),
                    body.get("time", ""),
                    body.get("location", "").strip(),
                    1 if body.get("isOnline") else 0,
                    body.get("link", "").strip(),
                    int(body.get("seats", 100)),
                    json.dumps(tags),
                    body.get("description", "").strip(),
                    body.get("imageUrl", "").strip(),
                ),
            )
            conn.commit()
            payload = {"events": list_events(conn)}
            conn.close()
            return self._json(201, payload)

        if parsed.path.startswith("/api/events/") and parsed.path.endswith("/register"):
            try:
                event_id = int(parsed.path.split("/")[3])
            except (ValueError, IndexError):
                conn.close()
                return self._json(400, {"error": "Invalid event id."})
            user = self._require_user(conn)
            if not user:
                conn.close()
                return self._json(401, {"error": "Login required."})
            existing = cur.execute(
                "SELECT id FROM registrations WHERE user_id = ? AND event_id = ?",
                (user["id"], event_id),
            ).fetchone()
            if not existing:
                cur.execute(
                    "INSERT INTO registrations (user_id, event_id, registered_at) VALUES (?, ?, ?)",
                    (user["id"], event_id, int(datetime.utcnow().timestamp() * 1000)),
                )
                cur.execute(
                    "UPDATE events SET registered = registered + 1 WHERE id = ?",
                    (event_id,),
                )
                conn.commit()
            payload = {
                "events": list_events(conn),
                "registrations": list_registrations(conn, user["id"]),
            }
            conn.close()
            return self._json(200, payload)

        conn.close()
        self._json(404, {"error": "Not found"})

    def do_PUT(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/events/"):
            return self._json(404, {"error": "Not found"})
        body = self._read_body()
        conn = db_conn()
        user = self._require_user(conn)
        if not user or user["role"] != "admin":
            conn.close()
            return self._json(403, {"error": "Admin access required."})
        try:
            event_id = int(parsed.path.split("/")[3])
        except (ValueError, IndexError):
            conn.close()
            return self._json(400, {"error": "Invalid event id."})
        conn.execute(
            """
            UPDATE events
            SET name=?, type=?, date=?, time=?, location=?, is_online=?, link=?, seats=?, tags=?, description=?, image_url=?
            WHERE id=?
            """,
            (
                body.get("name", "").strip(),
                body.get("type", "Conference"),
                body.get("date", ""),
                body.get("time", ""),
                body.get("location", "").strip(),
                1 if body.get("isOnline") else 0,
                body.get("link", "").strip(),
                int(body.get("seats", 100)),
                json.dumps(body.get("tags") or []),
                body.get("description", "").strip(),
                body.get("imageUrl", "").strip(),
                event_id,
            ),
        )
        conn.commit()
        payload = {"events": list_events(conn)}
        conn.close()
        self._json(200, payload)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/events/"):
            return self._json(404, {"error": "Not found"})
        conn = db_conn()
        user = self._require_user(conn)
        if not user or user["role"] != "admin":
            conn.close()
            return self._json(403, {"error": "Admin access required."})
        try:
            event_id = int(parsed.path.split("/")[3])
        except (ValueError, IndexError):
            conn.close()
            return self._json(400, {"error": "Invalid event id."})
        conn.execute("DELETE FROM registrations WHERE event_id = ?", (event_id,))
        conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        payload = {"events": list_events(conn), "registrations": list_registrations(conn, user["id"])}
        conn.close()
        self._json(200, payload)


def main():
    init_db()
    server = HTTPServer(("127.0.0.1", 5173), Handler)
    print("Server running on http://127.0.0.1:5173")
    print("Admin login: admin@eventsphere.local / admin123")
    server.serve_forever()


if __name__ == "__main__":
    main()

