import { useEffect, useRef, useState } from "react";
import { appParams } from "@/lib/app-params";

// Monta a URL base das funções igual ao SDK
function getFunctionsBaseUrl() {
  const { appId, functionsVersion, appBaseUrl } = appParams;
  const base = appBaseUrl || "https://base44.app";
  const version = functionsVersion || "v1";
  return `${base}/api/apps/${appId}/functions`;
}

export function useEvolutionSSE({ onNewMessage } = {}) {
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState([]);
  const esRef = useRef(null);

  const addLog = (type, label, data) => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date(),
      type,
      label,
      data,
    }, ...prev].slice(0, 200));
  };

  useEffect(() => {
    let es;

    function connect() {
      const { token } = appParams;
      const baseUrl = getFunctionsBaseUrl();
      const url = `${baseUrl}/evolutionSSEProxy${token ? `?access_token=${token}` : ""}`;

      addLog("info", "Conectando SSE...", { endpoint: "evolutionSSEProxy" });
      setStatus("connecting");

      es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        addLog("info", "SSE aberto", { msg: "aguardando proxy conectar ao socket.io..." });
      };

      es.addEventListener("proxy_status", (e) => {
        const data = JSON.parse(e.data);
        const logType = data.status === "connected" ? "success" : data.status === "error" ? "error" : "warn";
        addLog(logType, `proxy: ${data.status}`, data);
        setStatus(data.status === "connected" ? "connected" : data.status === "error" ? "error" : "disconnected");
      });

      es.addEventListener("new_message", (e) => {
        const data = JSON.parse(e.data);
        addLog("message", "new_message", data);
        if (onNewMessage) onNewMessage(data);
      });

      es.addEventListener("raw_event", (e) => {
        const data = JSON.parse(e.data);
        addLog("event", data.event || "evento", data.data);
      });

      es.onerror = () => {
        addLog("error", "SSE erro/reconectando", { msg: "EventSource tentará reconectar..." });
        setStatus("error");
      };
    }

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return { status, logs };
}