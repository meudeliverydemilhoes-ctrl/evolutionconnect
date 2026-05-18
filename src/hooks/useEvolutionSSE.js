import { useEffect, useRef, useState } from "react";
import { appParams } from "@/lib/app-params";

/**
 * Hook que conecta ao backend proxy via SSE.
 * @param {Function} onEvent - callback chamado com cada evento recebido
 */
export function useEvolutionSSE({ onEvent } = {}) {
  const [status, setStatus] = useState("connecting");
  const esRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const { appId, token, appBaseUrl } = appParams;
    const base = appBaseUrl || "";
    const tokenParam = token ? `?access_token=${token}` : "";
    const url = `${base}/api/apps/${appId}/functions/evolutionProxy${tokenParam}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus("connecting");

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "proxy_status") {
          if (msg.status === "connected") setStatus("connected");
          else if (msg.status === "error") setStatus("error");
          else setStatus("connecting");
        }
        onEventRef.current?.(msg);
      } catch (_) {}
    };

    es.onerror = () => setStatus("error");

    return () => {
      es.close();
    };
  }, []);

  return { status };
}