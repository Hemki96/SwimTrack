# Frontend State Patterns

Die Frontend-State-Schicht bündelt Cache-Handling und Eventing im Modul `src/scripts/state/`. Ergänzend definieren `src/scripts/config/cachePolicies.js` und `src/scripts/state/channels.js` gemeinsame Konstanten, damit Views dieselben Schlüssel und Laufzeiten verwenden.

## Cache-Grundlagen

- **Ablage**: Alle Werte werden über `state.setCached(key, value, { ttl })` persistiert. `ttl` erwartet Millisekunden und sorgt dafür, dass Einträge automatisch invalidiert werden, wenn sie ablaufen. Für neue Loader lohnt sich `CachePolicies` (z. B. `CachePolicies.SESSIONS_COLLECTION.ttl`).
- **Lesen**: Nutze `state.remember(key, loader, { ttl })`, um Laden und Caching zu kombinieren. Die Funktion übernimmt das Zurückschreiben in den Cache, wenn der Loader einen Wert liefert.
- **Namenskonventionen**: Verwende sprechende Schlüssel mit Präfixen (z. B. `${CachePolicies.SESSION_DETAIL.key}-<id>` oder `${CachePolicies.DASHBOARD.key}-<range>`), um gezieltes Invalidieren zu erleichtern.
- **Beispiele**:
  ```js
  import { CachePolicies, getCacheTtl } from '../config/cachePolicies.js';
  import { remember } from '../state.js';

  const SESSION_LIST_KEY = `${CachePolicies.SESSIONS_COLLECTION.key}-all`;

  function loadSessions() {
    return remember(
      SESSION_LIST_KEY,
      () => api.getSessions(),
      { ttl: getCacheTtl(CachePolicies.SESSIONS_COLLECTION) }
    );
  }
  ```

## Ereignisgesteuerte Invalidierung

- **Publizieren**: Nach mutierenden API-Calls ein Event senden, z. B. `state.publish(Channels.SESSIONS_UPDATED, { id, action })`. So können andere Views gezielt reagieren, ohne globale Clears auszulösen.
- **Abonnieren**: Registriere Listener einmalig (z. B. auf Modulebene) und räume die betroffenen Cache-Einträge auf.
  ```js
  import { Channels, invalidate, invalidateMatching, subscribe } from '../state.js';
  import { CachePolicies } from '../config/cachePolicies.js';

  let detachSessionsListener = null;

  function ensureSessionsSubscription() {
    if (!detachSessionsListener) {
      detachSessionsListener = subscribe(Channels.SESSIONS_UPDATED, (event) => {
        invalidate(`${CachePolicies.SESSIONS_COLLECTION.key}-all`);
        if (event?.id) {
          invalidate(`${CachePolicies.SESSION_DETAIL.key}-${event.id}`);
        } else {
          invalidateMatching(CachePolicies.SESSION_DETAIL.key);
        }
      });
    }
  }
  ```
- **Payloads**: Enthalten optional `id`, `action` oder zusätzliche Metadaten und bleiben bewusst frei gestaltet.
- **Kanäle**: Aktuell werden u. a. `Channels.SESSIONS_UPDATED` und `Channels.TEAMS_UPDATED` genutzt. Weitere Channels können bei Bedarf ergänzt werden.

## Force-Refresh & TTL

- Wenn ein View eine sofortige Aktualisierung benötigt (z. B. nach manuellen Filterwechseln), kann `setCached` mit kurzer TTL oder `invalidate(...)` innerhalb der View genutzt werden.
- Die Methode `reloadSessions(..., { forceReload: true })` demonstriert, wie lokale Invalidierung kombiniert mit Events verwendet wird, um Listen und Detailansichten synchron zu halten.

## Fehlerbehandlung & Retries

- API-Aufrufe über `src/scripts/api.js` werfen bei Fehlern einen `DomainError` mit Typ (`timeout`, `network_error`, `validation_error`, …) und optionalen Details. Die Implementierung basiert auf `createHttpClient` (`src/scripts/services/httpClient.js`) und kann bei Bedarf projektspezifisch konfiguriert werden.
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
