# SwimTrack

SwimTrack ist eine vollwertige Trainingsplattform für Schwimmteams. Das Repository enthält ein statisches High-Fidelity-Frontend, das die gelieferten HTML-Screens aus dem Ordner [`screens/`](./screens) unverändert lädt, sowie ein Node.js/Express-Backend mit SQLite-Datenbank für echte Datenflüsse. Die Kombination ermöglicht Trainer:innen, Sessions zu planen, Anwesenheit zu erfassen, Leistungsdaten zu analysieren und Reports zu exportieren.

## Inhaltsverzeichnis
1. [Funktionsumfang](#funktionsumfang)
2. [Architekturüberblick](#architekturüberblick)
3. [Frontend: Screens & Rendering](#frontend-screens--rendering)
4. [Design-Richtlinien](#design-richtlinien)
5. [Backend & Datenmodell](#backend--datenmodell)
6. [REST-API](#rest-api)
7. [Setup & lokale Entwicklung](#setup--lokale-entwicklung)
8. [NPM-Skripte](#npm-skripte)
9. [Deployment (Render.com)](#deployment-rendercom)
10. [Tipps für Erweiterungen](#tipps-für-erweiterungen)
11. [Tests & Qualitätssicherung](#tests--qualitätssicherung)
12. [Fehlerbehebung](#fehlerbehebung)

## Funktionsumfang
- **Dashboard:** KPIs zur Anwesenheit, Belastung und Sessions, Alerts, Fokus-Themen, Aktivitätenfeed und Coach-Notizen.
- **Trainingsverwaltung:** Filterbare Session-Übersicht, Detailansicht mit Anwesenheitsformular, Quick-Capture-Dialoge und Statusupdates.
- **Leistungsdatenerfassung:** Tabellen- und Trendansichten mit CSV-Exportlogik für Metriken und persönliche Bestzeiten.
- **Athletenprofile:** Suchfunktion, Kennzahlen, Messhistorie und Anwesenheitsverlauf pro Athlet:in.
- **Mannschaftsverwaltung:** Kartenübersicht inkl. Staff, Trainingsschwerpunkte und nächste Einheit pro Team.
- **Reports & Einstellungen:** Geplante Reportings, Export-Module und konfigurierbare Benachrichtigungen & Integrationen.

## Architekturüberblick
```
SwimTrack/
├── backend/               # Express-Server, Repository-Schicht, SQLite-Anbindung
│   ├── db.js              # Verbindung & Schema-Initialisierung
│   ├── repositories.js    # Aggregations- und Query-Layer
│   ├── schema.sql         # Datenbankschema
│   ├── seed.js            # Seeding-Logik (CLI)
│   └── seed_data.json     # Demo-Datensatz
├── screens/               # High-Fidelity HTML-Screens (Quelle für das UI)
├── src/
│   ├── scripts/
│   │   ├── app.js         # SPA-Shell, Routing, Template-Lader
│   │   ├── router.js      # In-Memory-Routing (data-route Buttons)
│   │   ├── templateLoader.js # Lädt HTML aus /screens und cached Templates
│   │   └── views/         # Renderschichten für einzelne Screens
│   └── styles/            # Tailwind-Hilfsstyles & Assets
├── docs/design-guidelines.md # Design-Tokens, Layout- und Komponentenregeln
├── index.html             # Einstiegspunkt & Tailwind-Konfiguration
├── render_start.sh        # Startskript für Render (setzt NODE_ENV, startet API)
├── render.yaml            # Render-Blueprint
└── package.json
```

## Frontend: Screens & Rendering
- **Unveränderte Screen-Templates:** Jede Route lädt exakt die gelieferten Dateien aus `screens/…/code.html` per `loadScreenTemplate`. Der HTML-Aufbau bleibt erhalten; dynamische Inhalte werden über `data-*`-Hooks und IDs ergänzt.
- **SPA-Routing:** `src/scripts/router.js` verwaltet eine In-Memory-Route. Buttons mit `data-route="..."` navigieren per `navigate()` ohne Seitenreload.
- **View-Renderer:** Für jeden Screen existiert ein Renderer (`src/scripts/views/*.js`), der DOM-Knoten innerhalb des geladenen Templates selektiert und mit Daten befüllt (z. B. `renderDashboard`, `renderTrainings`).
- **State & API-Layer:** `src/scripts/api.js` kapselt Fetch-Calls zur Backend-API, `src/scripts/state.js` liefert ein einfaches Cache- und Invalidierungsmodell, damit wiederkehrende Aufrufe performant bleiben.
- **Dark Mode & Tailwind:** `index.html` initialisiert Tailwind per CDN und definiert Farb-, Typografie- und Radius-Tokens. Der `dark`-Mode wird global auf dem `<html>`-Element aktiviert.

## Design-Richtlinien
Die aus den HTML-Screens abgeleiteten Regeln sind in [`docs/design-guidelines.md`](./docs/design-guidelines.md) dokumentiert. Kernelemente:
- Typografie mit **Lexend** in den Schnitten 400–900.
- Farbpalette inkl. Tokens für Light/Dark Mode (`primary`, `background-light/-dark`, `card-*`, `text-*`).
- Komponentenverhalten (Buttons, Karten, Tabellen, Dialoge) inklusive Shadow- und Hover-States.
- Layoutprinzipien für Sidebar, Header, Grid-Strukturen und responsive Breakpoints.
- Einsatz von Material Symbols Outlined Icons.

Neue Screens sollten sich strikt an diese Tokens und Klassen halten, damit sie sich nahtlos in das gelieferte UI einfügen.

## Backend & Datenmodell
Das Backend basiert auf Express.js mit einer SQLite-Datenbank (verwaltet durch `better-sqlite3`). Beim Start wird die Datenbank, falls notwendig, aus [`backend/schema.sql`](./backend/schema.sql) erstellt. Demo-Daten können über das CLI [`backend/seed.js`](./backend/seed.js) eingespielt werden, optional auch automatisiert per Umgebungsvariable (`SWIMTRACK_SEED_ON_START=1`).

### Tabellenübersicht
- **teams** – Stammdaten, Level, Coach, Trainingstage, Fokus-Thema.
- **athletes** – Personenstammdaten, Zugehörigkeit zu Teams, Fokus-Notizen.
- **sessions** – Trainingseinheiten inkl. Status, Fokus, Ziel-/Ist-Belastung, Notizen.
- **attendance** – Anwesenheitsstatus pro Session & Athlet:in (mit Notiz, `ON CONFLICT`-Upsert).
- **metrics** – Leistungskennzahlen (Datum, Typ, Wert, Einheit).
- **reports** – Reporting-Fenster, Status & Lieferdatum.
- **coach_notes** – Letzte Trainer:innen-Notizen zur Anzeige im Dashboard.

Alle Tabellen sind über Foreign Keys verknüpft und nutzen `ON DELETE CASCADE`, wo sinnvoll (z. B. Attendance).

## REST-API
Der Server stellt JSON-Endpunkte bereit (Basis: `http://localhost:8000`). Wichtige Routen:

| Methode | Route | Beschreibung |
|---------|-------|--------------|
| `GET` | `/dashboard` | Aggregierte Kennzahlen, Fokus-Themen, Aktivitäten, Coach-Note. |
| `GET` | `/teams` | Liste aller Teams inkl. Athlet:innenanzahl & nächste Einheit. |
| `GET` | `/teams/:teamId` | Detailansicht eines Teams inkl. Status-Breakdown & letzte Sessions. |
| `GET` | `/athletes` | Athletenliste mit Team, letztem Messwert & Bestzeit. |
| `GET` | `/athletes/:athleteId` | Athlet:innenprofil mit Metriken & Anwesenheitsverlauf. |
| `GET` | `/sessions` | Trainingsliste (Filter: `team_id`, `status`). |
| `GET` | `/sessions/:sessionId` | Detail inkl. Anwesenheitsliste. |
| `PATCH` | `/sessions/:sessionId` | Update von Status, Fokus, Notizen, Ist-Belastung. |
| `POST` | `/sessions/:sessionId/attendance` | Speichert Anwesenheitseinträge (Array von Objekten). |
| `GET` | `/metrics` | Leistungswerte (Filter: `team_id`, `metric_type`). |
| `GET` | `/reports` | Reporting-Übersicht mit Teamzuordnung. |
| `POST` | `/notes` | Legt eine neue Coach-Notiz an. |

Statische Assets (`/index.html`, `/src`, `/screens`, `/docs`) werden ebenfalls über Express ausgeliefert, sodass Frontend & Backend über denselben Service laufen.

## Setup & lokale Entwicklung
1. **Voraussetzungen:** Node.js ≥ 18, npm, optional SQLite CLI für direkte Datenbankinspektion.
2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```
3. **(Optional) Umgebungsvariablen konfigurieren**
   - Kopiere `.env.example` nach `.env` und passe Werte wie `PORT`, `SWIMTRACK_DB_PATH` oder CORS-Whitelists (`SWIMTRACK_ALLOWED_ORIGINS`) an.
   - Alternativ können die Variablen direkt in der Shell oder im Deployment gesetzt werden.
4. **Demodaten initialisieren**
   ```bash
   npm run seed
   ```
   Standardpfad ist `./swimtrack.db`. Über `SWIMTRACK_DB_PATH` kann ein anderer Speicherort gesetzt werden.
5. **Server starten**
   ```bash
   npm start
   ```
   Der Server läuft auf `http://localhost:8000` (konfigurierbar via `.env`) und dient sowohl API als auch Frontend.
6. **Entwicklung mit Auto-Reload**
   ```bash
   npm run dev
   ```
   Startet den Server über `nodemon` und führt bei Codeänderungen einen Neustart durch.

## NPM-Skripte
| Befehl | Beschreibung |
|--------|--------------|
| `npm start` | Startet den Produktionsserver (`backend/server.js`). |
| `npm run dev` | Entwicklermodus mit automatischen Restarts via `nodemon`. |
| `npm run seed` | Erstellt/aktualisiert die SQLite-Datenbank mit Demo-Daten (`--reset` optional). |
| `npm run lint` | Prüft das gesamte Repository mit ESLint (Backend & Frontend). |
| `npm run test:backend` | Führt die Node.js Unit-Tests gegen das In-Memory-SQLite-Setup aus. |
| `npm run test:frontend` | Startet die Vitest-Suite (jsdom) für Hooks und Komponenten. |
| `npm run test:integration` | Führt die API-Integrationssuite (`tests/api.test.js`) mit echtem Server-Prozess aus. |
| `npm test` | Orchestriert Linting, Backend-/Frontend-Unit- und Integrations-Tests in einer Pipeline. |

## Deployment (Render.com)
1. Repository in Render als **Blueprint** importieren.
2. Render erkennt `render.yaml`, installiert Abhängigkeiten und ruft `npm install` auf.
3. Beim Start wird `render_start.sh` ausgeführt und startet den Server mit `NODE_ENV=production`.
4. Setze die notwendigen Umgebungsvariablen (`PORT`, `SWIMTRACK_DB_PATH`, `SWIMTRACK_ALLOWED_ORIGINS`, …) direkt im Render-Dashboard oder per Blueprint-Secret.
5. Falls Demodaten benötigt werden, kann vor dem ersten Start `npm run seed` ausgeführt oder `SWIMTRACK_SEED_ON_START=1` gesetzt werden (setzt vorhandene Daten nicht zurück).

## Tipps für Erweiterungen
- **Neue Screens:** Lege die HTML-Datei im Ordner `screens/` ab und erweitere das `SCREEN_PATHS`-Mapping in `src/scripts/app.js`. Schreibe einen Renderer in `src/scripts/views/` und nutze vorhandene Utility-Klassen.
- **Design-Konsistenz:** Halte dich an die Token aus `docs/design-guidelines.md` und nutze Material Symbols Icons über `<span class="material-symbols-outlined">`.
- **API-Erweiterungen:** Implementiere Queries in `backend/repositories.js`, hänge Express-Routen in `backend/server.js` an und erweitere bei Bedarf die Seed-Daten.
- **State-Invalidierung:** Sende nach mutierenden Aktionen gezielte Events wie `state.publish('sessions/updated')` und reagiere in Views über `state.subscribe(...)`, um nur die betroffenen Caches zu löschen.

## Tests & Qualitätssicherung
- **Backend-Unit-Tests:** Unter `tests/backend/` laufen Node.js-Tests gegen eine In-Memory-SQLite-Instanz. Das Helper-Modul [`tests/backend/helpers/testDb.js`](./tests/backend/helpers/testDb.js) setzt `SWIMTRACK_DB_PATH=":memory:"`, initialisiert Schema & Seed-Daten und stellt für jede Testdatei eine saubere Datenbank bereit.
- **Frontend-Unit-Tests:** Die Vitest-Konfiguration ([`vitest.config.js`](./vitest.config.js)) nutzt `jsdom`, um Hooks/Utilities wie [`src/scripts/state.js`](./src/scripts/state.js) und [`src/scripts/templateLoader.js`](./src/scripts/templateLoader.js) isoliert zu testen. Gemeinsame Setups leben in [`tests/frontend/setupTests.js`](./tests/frontend/setupTests.js).
- **Integrationstests:** [`tests/api.test.js`](./tests/api.test.js) startet das Express-Backend gegen eine temporäre SQLite-Datei und prüft komplette Request-Flows inkl. Dashboard- und Session-Endpunkten.
- **Zentrales Testkommando:** `npm test` verkettet `npm run lint`, `npm run test:backend`, `npm run test:frontend` und `npm run test:integration`, sodass ein einzelner Befehl Linting sowie sämtliche Unit- und Integrations-Checks abdeckt.
- **CI-Pipeline:** Die GitHub-Action [`ci.yml`](./.github/workflows/ci.yml) läuft auf jedem Push/PR, führt `npm ci`, ein Datenbank-Seeding (`npm run seed -- --silent`) und anschließend `npm test` aus. Dadurch ist sichergestellt, dass Linting, Unit- und Integrations-Tests inklusive Seed-Voraussetzung automatisch geprüft werden.

## Fehlerbehebung
| Problem | Hinweis |
|---------|--------|
| **"schema.sql nicht gefunden"** | Stelle sicher, dass das Projekt vollständig ausgecheckt ist – der Server benötigt die Datei beim ersten Start. |
| **API antwortet nicht** | Prüfe, ob `npm start` ohne Fehler läuft und Port 8000 frei ist. Logs erscheinen direkt in der Konsole. |
| **Frontend zeigt leere Screens** | Vergewissere dich, dass der Server `/screens` ausliefert und keine Netzwerkanfragen geblockt werden (Browser-Konsole prüfen). |
| **Datenbankänderungen werden nicht übernommen** | Nach Anpassungen an `seed_data.json` `npm run seed -- --reset` ausführen oder die Datei `swimtrack.db` löschen. |
| **Tailwind-Klassen greifen nicht** | Die Klassen stammen aus den gelieferten HTML-Templates. Erweiterungen müssen kompatible Utility-Klassen nutzen; Custom CSS gehört in `src/styles`. |

