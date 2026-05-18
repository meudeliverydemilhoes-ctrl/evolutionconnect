import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Trash2, Radio } from "lucide-react";
import { format } from "date-fns";
import { useEvolutionSSE } from "@/hooks/useEvolutionSSE";

const typeStyle = {
  info:         "bg-blue-100 text-blue-700",
  success:      "bg-green-100 text-green-700",
  warn:         "bg-yellow-100 text-yellow-700",
  error:        "bg-red-100 text-red-700",
  event:        "bg-purple-100 text-purple-700",
  proxy_status: "bg-cyan-100 text-cyan-700",
  new_message:  "bg-emerald-100 text-emerald-700",
};

export default function SocketDebug() {
  const [logs, setLogs] = useState([]);

  const addLog = (type, label, data) => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date(),
      type, label, data,
    }, ...prev].slice(0, 200));
  };

  const { status } = useEvolutionSSE({
    onEvent: (msg) => {
      if (msg.type === "proxy_status") {
        addLog("proxy_status", `proxy:${msg.status}`, msg);
      } else if (msg.type === "new_message") {
        addLog("new_message", "new_message", msg);
      } else if (msg.type === "event") {
        addLog("event", msg.event, msg.data);
      }
    },
  });

  const statusConfig = {
    connected:    { color: "text-green-400", icon: <Wifi className="w-4 h-4" />, label: "Proxy conectado" },
    connecting:   { color: "text-yellow-400", icon: <Radio className="w-4 h-4 animate-pulse" />, label: "Conectando..." },
    error:        { color: "text-red-400",   icon: <WifiOff className="w-4 h-4" />, label: "Erro" },
  }[status] ?? { color: "text-gray-400", icon: <WifiOff className="w-4 h-4" />, label: status };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Socket Debug</h1>
            <p className="text-xs text-gray-400 mt-0.5">via Backend Proxy → Evolution API (SSE)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
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
            <span className="w-24">Hora</span>
            <span className="w-32">Tipo/Evento</span>
            <span className="flex-1">Dados</span>
          </div>

          <div className="overflow-y-auto max-h-[70vh]">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-gray-600 text-sm">
                Aguardando eventos do proxy...
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/40 text-xs">
                  <span className="text-gray-500 w-24 flex-shrink-0 pt-0.5">
                    {format(log.time, "HH:mm:ss.SSS")}
                  </span>
                  <span className="w-32 flex-shrink-0">
                    <Badge className={`text-xs px-2 py-0.5 ${typeStyle[log.type] || "bg-gray-100 text-gray-700"}`}>
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
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-3 text-center">
          Mostrando até 200 eventos · mais recentes no topo · API key não exposta no frontend
        </p>
      </div>
    </div>
  );
}