import { useEvolutionSSE } from "@/hooks/useEvolutionSSE";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Loader, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const typeStyle = {
  info:    "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warn:    "bg-yellow-100 text-yellow-700",
  error:   "bg-red-100 text-red-700",
  event:   "bg-purple-100 text-purple-700",
  message: "bg-teal-100 text-teal-700",
};

const statusConfig = {
  connected:    { color: "text-green-400", icon: <Wifi className="w-4 h-4" />, label: "Conectado" },
  connecting:   { color: "text-yellow-400", icon: <Loader className="w-4 h-4 animate-spin" />, label: "Conectando..." },
  disconnected: { color: "text-gray-500", icon: <WifiOff className="w-4 h-4" />, label: "Desconectado" },
  error:        { color: "text-red-400", icon: <WifiOff className="w-4 h-4" />, label: "Erro" },
};

export default function SocketDebug() {
  const { status, logs: sseLog } = useEvolutionSSE({});
  const [localLogs, setLocalLogs] = useState([]);

  // merge SSE logs com local, usando sseLog diretamente
  const allLogs = sseLog;

  const cfg = statusConfig[status] || statusConfig.disconnected;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Socket Debug <span className="text-xs font-normal text-gray-500 ml-2">via SSE Proxy</span></h1>
            <p className="text-xs text-gray-500 mt-0.5">Backend → Evolution API socket.io → SSE → Frontend</p>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${cfg.color}`}>
            {cfg.icon}
            <span>{cfg.label}</span>
          </div>
        </div>

        {/* Log list */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="w-24">Hora</span>
              <span className="w-32">Tipo</span>
              <span>Dados</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{allLogs.length} eventos</span>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[75vh]">
            {allLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-600 text-sm">
                <Loader className="w-6 h-6 animate-spin mx-auto mb-3 text-gray-700" />
                Aguardando eventos do proxy SSE...
              </div>
            ) : (
              allLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/40 text-xs">
                  <span className="text-gray-500 w-24 flex-shrink-0 pt-0.5">
                    {format(log.time, "HH:mm:ss.SSS")}
                  </span>
                  <span className="w-32 flex-shrink-0">
                    <Badge className={`text-xs px-2 py-0.5 ${typeStyle[log.type] || typeStyle.event}`}>
                      {log.label}
                    </Badge>
                  </span>
                  <pre className="flex-1 text-gray-300 whitespace-pre-wrap break-all text-xs leading-relaxed">
                    {log.data !== undefined && log.data !== null
                      ? (typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2))
                      : ""}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-3 text-center">
          Proxy: backend conecta socket.io → repassa via SSE · mostrando até 200 eventos
        </p>
      </div>
    </div>
  );
}