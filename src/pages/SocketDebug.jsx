import { useState, useEffect } from "react";
import { Wifi } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

export default function SocketDebug() {
  const [allLogs, setAllLogs] = useState([]);

  useEffect(() => {
    const unsub = base44.entities.Message.subscribe((event) => {
      setAllLogs(prev => [{
        id: Date.now() + Math.random(),
        time: new Date(),
        type: event.type,
        label: `message.${event.type}`,
        data: event.data,
      }, ...prev].slice(0, 200));
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Socket Debug</h1>
            <p className="text-xs text-gray-500 mt-0.5">Subscribe nativo base44 · mensagens em tempo real</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-green-400">
            <Wifi className="w-4 h-4" />
            <span>Live</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="w-24">Hora</span>
              <span className="w-32">Tipo</span>
              <span>Dados</span>
            </div>
            <span className="text-xs text-gray-600">{allLogs.length} eventos</span>
          </div>

          <div className="overflow-y-auto max-h-[75vh]">
            {allLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-600 text-sm">
                Aguardando eventos de mensagens em tempo real...
              </div>
            ) : (
              allLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/40 text-xs">
                  <span className="text-gray-500 w-24 flex-shrink-0 pt-0.5">
                    {format(log.time, "HH:mm:ss.SSS")}
                  </span>
                  <span className="w-32 flex-shrink-0">
                    <Badge className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700">
                      {log.label}
                    </Badge>
                  </span>
                  <pre className="flex-1 text-gray-300 whitespace-pre-wrap break-all text-xs leading-relaxed">
                    {log.data ? (typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)) : ""}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}