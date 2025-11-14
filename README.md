# SwimTrack

SwimTrack ist eine webbasierte Trainingsplattform für Schwimmteams. Das Projekt kombiniert ein statisches HTML/CSS/JS-Frontend
mit einem Node.js/Express Backend inklusive SQLite-Datenbank und liefert damit ein funktionsfähiges MVP mit echten Datenflüssen.

## Funktionsumfang
- **Dashboard:** KPIs, Trainingsbelastung, Anwesenheitsquote, Fokusthemen, Aktivitätenfeed und Trainer:innen-Notiz.
- **Trainingsverwaltung:** Filterbare Session-Übersicht, Detailansicht mit Anwesenheitsformular und Quick-Capture-Dialog.
- **Leistungsdaten:** Tabellen- und Trendansichten der Messwerte inklusive CSV-Export.
- **Athletenprofile:** Suchfunktion, Kennzahlen, Messhistorie und Anwesenheitsverlauf pro Athlet:in.
- **Mannschaften:** Kartenübersicht, Trainer:innenliste und Fokusinformationen.
- **Reporting & Einstellungen:** Übersicht geplanter Reports sowie konfigurierbare Benachrichtigungen.

## Technologie
- **Backend:** Express.js mit SQLite (Konfigurierbar über `SWIMTRACK_DB_PATH`, Seed-Daten, REST-Endpunkte).
- **Frontend:** Statisches HTML/CSS mit modularen ES-Modules für Routing, API-Kommunikation und Rendering.
- **Tooling:** Node.js 18+, `better-sqlite3` für Datenbankzugriffe, Seed-Skript zum Initialisieren der Demo-Datenbank.

## Projektstruktur
```
SwimTrack/
├── backend/
│   ├── db.js                # SQLite-Verwaltung und Initialisierung
│   ├── repositories.js      # Datenbankabfragen & Aggregationen
│   ├── seed.js              # Initialbefüllung der Datenbank (CLI & Helper)
│   └── server.js            # Express-Anwendung und REST-Endpunkte
├── docs/                    # Konzept- und Designunterlagen
├── src/
│   ├── assets/logo.svg
│   ├── scripts/             # SPA-Shell, Routing und Views
│   └── styles/              # Layout- und Komponenten-Styles
├── index.html               # Einstiegspunkt des Frontends
├── package.json             # Node.js-Abhängigkeiten & Skripte
├── render.yaml              # Render-Infrastrukturdefinition (Free Web Service)
└── render_start.sh          # Startskript (Seeding + Serverstart)
```

## Setup & Entwicklung
1. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

2. **Datenbank initialisieren**
   ```bash
   npm run seed
   ```
   Das Skript legt die SQLite-Datei an (Standard: `./swimtrack.db`) und befüllt sie mit Demo-Daten. Über die
   Umgebungsvariable `SWIMTRACK_DB_PATH` kann ein alternativer Speicherort gesetzt werden.

3. **Server starten**
   ```bash
   npm start
   ```
   Die API läuft standardmäßig auf `http://localhost:8000` und liefert `index.html` sowie alle Assets direkt aus.

Für Hot-Reload während der Entwicklung steht zusätzlich `npm run dev` (mit `nodemon`) zur Verfügung.

## Tests
Automatisierte API-Tests sind aktuell nicht enthalten. Für manuelle Verifizierung können die Seed-Daten
über `npm run seed` zurückgesetzt und die REST-Endpunkte mit Tools wie `curl` oder `Thunder Client`
angesprochen werden.

## API-Überblick
- `GET /dashboard` – Aggregierte Kennzahlen inkl. Fokusthemen, Aktivitäten und Coach-Note.
- `GET /teams`, `GET /teams/{id}` – Mannschaftsdaten samt Athletenanzahl und Sessions.
- `GET /athletes`, `GET /athletes/{id}` – Athletenstammdaten inkl. Metriken & Anwesenheit.
- `GET /sessions`, `GET /sessions/{id}` – Trainingsübersicht & Detail inkl. Anwesenheit.
- `PATCH /sessions/{id}` – Status/Fokus/Notizen aktualisieren (Quick-Capture).
- `POST /sessions/{id}/attendance` – Anwesenheitswerte speichern.
- `GET /metrics` – Leistungswerte mit Filtern für Team & Messart.
- `GET /reports` – Geplante und abgeschlossene Reports.
- `POST /notes` – Trainer:innen-Notizen sichern.

## Deployment auf Render (kostenfrei)
1. Repository bei Render verbinden (`New +` → **Blueprint**).
2. Render erkennt die `render.yaml` (Node Runtime) und installiert Abhängigkeiten via `npm install`.
3. Beim Start führt Render `./render_start.sh` aus:
   - Das Skript setzt die Demo-Datenbank neu auf (`node backend/seed.js --reset`).
   - Anschließend startet es den Express-Server auf Port `8000` (bzw. `$PORT`).
4. Frontend und API laufen auf demselben Service, ein separates Hosting ist nicht erforderlich.

Über `SWIMTRACK_DB_PATH` kann für Render ein schreibbares Volume (z. B. `/tmp/swimtrack.db`) genutzt werden.
