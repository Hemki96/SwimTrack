# Frontend State Patterns

Die Frontend-State-Schicht bündelt Cache-Handling und Eventing im Modul `src/scripts/state/`. Die folgenden Konventionen helfen dabei, konsistente Datenflüsse zwischen den Views zu behalten.

## Cache-Grundlagen

- **Ablage**: Alle Werte werden über `state.setCached(key, value, { ttl })` persistiert. `ttl` erwartet Millisekunden und sorgt dafür, dass Einträge automatisch invalidiert werden, wenn sie ablaufen.
- **Lesen**: Nutze `state.getCached(key)` und prüfe auf `undefined`. Für Lazy-Loader steht `state.remember(key, loader, { ttl })` zur Verfügung.
- **Namenskonventionen**: Verwende sprechende Schlüssel mit Präfixen (z. B. `session-<id>` oder `dashboard-data-<range>`), um gezieltes Invalidieren zu erleichtern.
- **Beispiele**:
  ```js
  const SESSION_LIST_KEY = "sessions-all";
  const SESSION_LIST_TTL = 60 * 1000; // 1 Minute

  async function loadSessions() {
    const cached = getCached(SESSION_LIST_KEY);
    if (cached) return cached;
    const sessions = await api.getSessions();
    return setCached(SESSION_LIST_KEY, sessions, { ttl: SESSION_LIST_TTL });
  }
  ```

## Ereignisgesteuerte Invalidierung

- **Publizieren**: Nach mutierenden API-Calls ein Event senden, z. B. `state.publish('sessions/updated', { id, action })`. So können andere Views gezielt reagieren, ohne globale Clears auszulösen.
- **Abonnieren**: Registriere Listener einmalig (z. B. auf Modulebene) und räume die betroffenen Cache-Einträge auf.
  ```js
  let detachSessionsListener = null;

  function ensureSessionsSubscription() {
    if (!detachSessionsListener) {
      detachSessionsListener = subscribe('sessions/updated', (event) => {
        invalidate('sessions-all');
        if (event?.id) {
          invalidate(`session-${event.id}`);
        } else {
          invalidateMatching('session-');
        }
      });
    }
  }
  ```
- **Payloads**: Enthalten optional `id`, `action` oder zusätzliche Metadaten und bleiben bewusst frei gestaltet.
- **Kanäle**: Aktuell werden u. a. `sessions/updated` und `teams/updated` genutzt. Weitere Channels können bei Bedarf ergänzt werden.

## Force-Refresh & TTL

- Wenn ein View eine sofortige Aktualisierung benötigt (z. B. nach manuellen Filterwechseln), kann `setCached` mit kurzer TTL oder `invalidate(...)` innerhalb der View genutzt werden.
- Die Methode `reloadSessions(..., { forceReload: true })` demonstriert, wie lokale Invalidierung kombiniert mit Events verwendet wird, um Listen und Detailansichten synchron zu halten.

## Fehlerbehandlung & Retries

- API-Aufrufe über `src/scripts/api.js` werfen bei Fehlern einen `DomainError` mit Typ (`timeout`, `network_error`, `validation_error`, …) und optionalen Details.
- Optional lassen sich Retries (`retry: { retries: 2 }`) oder Timeouts (`timeout: 8000`) direkt am Request konfigurieren.
- Fehler lassen sich gezielt behandeln:
  ```js
  try {
    await api.updateSession(id, payload);
  } catch (error) {
    if (error instanceof DomainError && error.type === 'validation_error') {
      showFeedback(error.details);
    } else {
      console.error(error);
    }
  }
  ```

## Zusammenfassung

1. Daten werden per Cache mit TTL abgelegt (`state.setCached`).
2. Nach Mutationen wird ein Event veröffentlicht (`state.publish('…')`).
3. Views abonnieren relevante Kanäle (`state.subscribe`) und invalidieren gezielt die passenden Keys.
4. Bei Bedarf ergänzen Timeouts & Retries im API-Client die Robustheit.

Dieses Muster hält den Client reaktionsfähig und vermeidet unnötige Netzwerkaufrufe.
