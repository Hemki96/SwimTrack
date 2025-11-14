# SwimTrack

SwimTrack ist eine webbasierte Trainingsplattform für Schwimmteams. Das Projekt setzt das technische Konzept aus Domänenmodell,
REST-API und Frontend-Modulen um und liefert damit ein voll funktionsfähiges MVP mit echten Datenflüssen.

## Funktionsumfang
- **Dashboard:** KPIs, Trainingsbelastung, Anwesenheitsquote, Fokusthemen, Aktivitätenfeed und Trainer:innen-Notiz.
- **Trainingsverwaltung:** Filterbare Session-Übersicht, Detailansicht mit Anwesenheitsformular und Quick-Capture-Dialog.
- **Leistungsdaten:** Tabellen- und Trendansichten der Messwerte inklusive CSV-Export.
- **Athletenprofile:** Suchfunktion, Kennzahlen, Messhistorie und Anwesenheitsverlauf pro Athlet:in.
- **Mannschaften:** Kartenübersicht, Trainer:innenliste und Fokusinformationen.
- **Reporting & Einstellungen:** Übersicht geplanter Reports sowie konfigurierbare Benachrichtigungen.

## Technologie
- **Backend:** FastAPI mit SQLite (per `SWIMTRACK_DB_PATH` konfigurierbarer Speicherort, Seed-Daten, REST-Endpunkte, Tests via `pytest`).
- **Frontend:** Statisches HTML/CSS mit modularen ES-Modules für Routing, API-Kommunikation und Rendering, wird durch FastAPI als StaticFiles ausgeliefert.
- **Tooling:** Python 3.11+, `uvicorn` für das API-Serving, automatisches Seeding via `render_start.sh`/`python -m backend.seed`.

## Projektstruktur
```
SwimTrack/
├── backend/
│   ├── app.py               # FastAPI-Anwendung und REST-Endpunkte
│   ├── database.py          # SQLite-Verwaltung und Connection-Helper
│   ├── repositories.py      # Datenbankabfragen & Aggregationen
│   ├── schema.sql           # Datenbankschema
│   ├── seed.py              # Initialbefüllung der Datenbank
│   └── seed_data.json       # Seed-Datensätze
├── src/
│   ├── assets/logo.svg
│   ├── scripts/
│   │   ├── api.js           # REST-Client
│   │   ├── app.js           # SPA-Shell & Routing
│   │   ├── router.js        # einfache Routing-Implementierung
│   │   ├── state.js         # Caching-Helfer
│   │   └── views/           # modulare View-Renderer (Dashboard, Trainings, ...)
│   └── styles/
│       ├── layout.css
│       └── main.css
├── index.html               # Einstiegspunkt des Frontends
├── requirements.txt         # Python-Abhängigkeiten
├── render_start.sh          # Startskript für gehostete Umgebung (Seeding + Uvicorn)
├── render.yaml              # Render-Infrastrukturdefinition (Free Web Service)
└── tests/test_api.py        # API-Tests
```

## Setup & Entwicklung
1. **Python-Umgebung vorbereiten**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Datenbank initialisieren**
   ```bash
   python -m backend.seed
   ```

3. **API starten**
   ```bash
   uvicorn backend.app:app --reload
   ```
   Die API läuft standardmäßig auf `http://localhost:8000`.

4. **Frontend aufrufen**
   Öffne `http://localhost:8000/` – die FastAPI-Anwendung liefert `index.html` und die zugehörigen Assets direkt aus.

### Produktion/Start ohne Reload
```bash
./render_start.sh
```
Das Skript initialisiert die SQLite-Datenbank (mit Reset) und startet `uvicorn` auf Port `8000` (bzw. `$PORT`).

## Tests
```bash
pytest
```
Die Tests initialisieren die SQLite-Datenbank neu, seed'en sie und prüfen zentrale Endpunkte (Dashboard, Sessions, Anwesenheit, Notizen).

## API-Überblick
- `GET /dashboard` – aggregierte Kennzahlen inkl. Fokusthemen, Aktivitäten und Coach-Note.
- `GET /teams`, `GET /teams/{id}` – Mannschaftsdaten samt Athletenanzahl und Sessions.
- `GET /athletes`, `GET /athletes/{id}` – Athletenstammdaten inkl. Metriken & Anwesenheit.
- `GET /sessions`, `GET /sessions/{id}` – Trainingsübersicht & Detail inkl. Anwesenheit.
- `PATCH /sessions/{id}` – Status/Fokus/Notizen aktualisieren (Quick-Capture).
- `POST /sessions/{id}/attendance` – Anwesenheitswerte speichern.
- `GET /metrics` – Leistungswerte mit Filtern für Team & Messart.
- `GET /reports` – Geplante und abgeschlossene Reports.
- `POST /notes` – Trainer:innen-Notizen sichern.

Damit steht ein durchgängiger Flow von Datenspeicherung über API-Zugriff bis zum UI-Rendering bereit.

## Deployment auf Render (kostenfrei)
1. Repository bei Render verbinden (`New +` → **Blueprint**). Render erkennt automatisch die `render.yaml`.
2. Während der Erstellung sicherstellen, dass der kostenlose Plan gewählt ist.
3. Render führt beim Build `pip install -r requirements.txt` aus und startet anschließend `./render_start.sh`.
   - Das Skript setzt die Demo-Datenbank neu auf (`python -m backend.seed --reset`) und startet die FastAPI-Anwendung.
   - Über die Umgebungsvariable `SWIMTRACK_DB_PATH` (standardmäßig `/tmp/swimtrack.db`) liegt die SQLite-Datei auf dem schreibbaren temporären Volume der Render Free-Instanz.
4. Nach dem Deploy steht die Anwendung unter der Render-URL zur Verfügung. API und Frontend laufen auf demselben Service, daher ist kein separates Hosting des Frontends erforderlich.

Optional lassen sich weitere Render-Umgebungsvariablen hinterlegen (z. B. für CORS-Restriktionen oder alternative Datenbankpfade); das Blueprint-Deployment setzt jedoch ohne weitere Anpassungen vollständig auf kostenfreien Render-Komponenten auf.
