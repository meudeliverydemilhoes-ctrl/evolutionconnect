import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Trash2 } from "lucide-react";
import { format } from "date-fns";

const EVOLUTION_URL = "https://evolution-api-production-36e1.up.railway.app";
const EVOLUTION_KEY = "049EE924-CB86-4E11-8F80-3F690969C460";

export default function SocketDebug() {
  const [status, setStatus] = useState("disconnected");
  const [socketId, setSocketId] = useState(null);
  const [logs, setLogs] = useState([]);
  const socketRef = useRef(null);
  const logsEndRef = useRef(null);

  const addLog = (type, label, data) => {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date(),
      type,
      label,
      data,
    };
    setLogs(prev => [entry, ...prev].slice(0, 200));
  };

  useEffect(() => {
    addLog("info", "Conectando...", { url: EVOLUTION_URL });

    const socket = io(EVOLUTION_URL, {
      transports: ["websocket", "polling"],
      extraHeaders: { apikey: EVOLUTION_KEY },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setSocketId(socket.id);
      addLog("success", "connect", { socketId: socket.id });
    });

    socket.on("disconnect", (reason) => {
      setStatus("disconnected");
      setSocketId(null);
      addLog("warn", "disconnect", { reason });
    });

    socket.on("connect_error", (err) => {
      setStatus("error");
      addLog("error", "connect_error", { message: err.message, type: err.type });
    });

    socket.onAny((event, ...args) => {
      addLog("event", event, args);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const typeStyle = {
    info:    "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warn:    "bg-yellow-100 text-yellow-700",
    error:   "bg-red-100 text-red-700",
    event:   "bg-purple-100 text-purple-700",
  };

  const statusConfig = {
    connected:    { color: "text-green-600", icon: <Wifi className="w-4 h-4" />, label: "Conectado" },
    disconnected: { color: "text-gray-500",  icon: <WifiOff className="w-4 h-4" />, label: "Desconectado" },
    error:        { color: "text-red-600",   icon: <WifiOff className="w-4 h-4" />, label: "Erro" },
  }[status];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Socket Debug</h1>
            <p className="text-xs text-gray-400 mt-0.5">{EVOLUTION_URL}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
              {socketId && <span className="text-xs text-gray-500">({socketId})</span>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => setLogs([])}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Limpar
            </Button>
          </div>
        </div>

        {/* Log list */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
            <span className="w-20">Hora</span>
            <span className="w-28">Tipo</span>
            <span className="flex-1">Evento / Dados</span>
          </div>

          <div className="overflow-y-auto max-h-[70vh]">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-gray-600 text-sm">
                Aguardando eventos do socket...
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/40 text-xs">
                  <span className="text-gray-500 w-20 flex-shrink-0 pt-0.5">
                    {format(log.time, "HH:mm:ss.SSS")}
                  </span>
                  <span className={`w-28 flex-shrink-0`}>
                    <Badge className={`text-xs px-2 py-0.5 ${typeStyle[log.type]}`}>
                      {log.label}
                    </Badge>
                  </span>
                  <pre className="flex-1 text-gray-300 whitespace-pre-wrap break-all text-xs leading-relaxed">
                    {log.data !== undefined && log.data !== null
                      ? JSON.stringify(log.data, null, 2)
                      : ""}
                  </pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-3 text-center">
          Mostrando até 200 eventos · mais recentes no topo
        </p>
      </div>
    </div>
  );
}