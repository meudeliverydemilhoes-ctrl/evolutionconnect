import { useEffect, useRef, useState } from "react";
import { appParams } from "@/lib/app-params";

// Monta a URL base das funções igual ao SDK
function getFunctionsBaseUrl() {
  const { appId, functionsVersion, appBaseUrl } = appParams;
  const base = appBaseUrl || "https://base44.app";
  const version = functionsVersion || "v1";
  return `${base}/api/apps/${appId}/functions`;
}

// Singleton global — garante apenas UMA conexão SSE em toda a aplicação
let globalES = null;
let globalListeners = new Set();
let globalStatus = "disconnected";
let globalLogs = [];
const statusListeners = new Set();
const logsListeners = new Set();

function notifyStatus(s) {
  globalStatus = s;
  statusListeners.forEach(fn => fn(s));
}
function notifyLogs(l) {
  globalLogs = l;
  logsListeners.forEach(fn => fn([...l]));
}
function addGlobalLog(type, label, data) {
  globalLogs = [{ id: Date.now() + Math.random(), time: new Date(), type, label, data }, ...globalLogs].slice(0, 200);
  notifyLogs(globalLogs);
}

function ensureConnected() {
  if (globalES && globalES.readyState !== EventSource.CLOSED) return;

  const { token } = appParams;
  const baseUrl = getFunctionsBaseUrl();
  const url = `${baseUrl}/evolutionSSEProxy${token ? `?access_token=${token}` : ""}`;

  addGlobalLog("info", "Conectando SSE...", { endpoint: "evolutionSSEProxy" });
  notifyStatus("connecting");

  const es = new EventSource(url);
  globalES = es;

  es.onopen = () => {
    addGlobalLog("info", "SSE aberto", { msg: "aguardando proxy conectar ao socket.io..." });
  };

  es.addEventListener("proxy_status", (e) => {
    const data = JSON.parse(e.data);
    const logType = data.status === "connected" ? "success" : data.status === "error" ? "error" : "warn";
    addGlobalLog(logType, `proxy: ${data.status}`, data);
    notifyStatus(data.status === "connected" ? "connected" : data.status === "error" ? "error" : "disconnected");
  });

  es.addEventListener("new_message", (e) => {
    const data = JSON.parse(e.data);
    addGlobalLog("message", "new_message", data);
    globalListeners.forEach(fn => fn(data));
  });

  es.addEventListener("raw_event", (e) => {
    const data = JSON.parse(e.data);
    addGlobalLog("event", data.event || "evento", data.data);
  });

  es.onerror = () => {
    addGlobalLog("error", "SSE erro", { msg: "Conexão perdida, reconectando em 5s..." });
    notifyStatus("error");
    es.close();
    globalES = null;
    setTimeout(ensureConnected, 5000);
  };
}

export function useEvolutionSSE({ onNewMessage } = {}) {
  const [status, setStatus] = useState(globalStatus);
  const [logs, setLogs] = useState(globalLogs);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    const statusFn = (s) => setStatus(s);
    const logsFn = (l) => setLogs(l);
    const msgFn = (data) => { if (onNewMessageRef.current) onNewMessageRef.current(data); };

    statusListeners.add(statusFn);
    logsListeners.add(logsFn);
    globalListeners.add(msgFn);

    ensureConnected();

    return () => {
      statusListeners.delete(statusFn);
      logsListeners.delete(logsFn);
      globalListeners.delete(msgFn);
    };
  }, []);

  return { status, logs };
}