import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="text-xs text-gray-400 w-36 flex-shrink-0">
          {log.createdAt ? format(new Date(log.createdAt), "dd/MM HH:mm:ss") : "—"}
        </span>
        <Badge variant="outline" className="text-xs flex-shrink-0">{log.event || "—"}</Badge>
        <span className="text-xs text-gray-500 flex-shrink-0 w-28 truncate">{log.instance || "—"}</span>
        <span className={`text-xs flex-shrink-0 font-medium ${log.fromMe ? "text-blue-600" : "text-green-600"}`}>
          {log.fromMe ? "fromMe" : "deles"}
        </span>
        <span className="text-xs text-gray-500 truncate flex-shrink-0 w-44">{log.remoteJid || "—"}</span>
        <span className="text-xs text-gray-700 truncate flex-1">{log.messageText || <span className="italic text-gray-400">sem texto</span>}</span>
      </div>

      {expanded && (
        <div className="px-10 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">rawBody:</p>
          <pre className="bg-gray-900 text-green-300 text-xs rounded-md p-3 overflow-x-auto max-h-96 whitespace-pre-wrap break-all">
            {(() => {
              try { return JSON.stringify(JSON.parse(log.rawBody), null, 2); }
              catch { return log.rawBody; }
            })()}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DebugWebhook() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: () => base44.entities.WebhookLog.list("-createdAt", 50),
    refetchInterval: 5000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Webhook</h1>
            <p className="text-sm text-gray-500 mt-1">
              Últimos 50 eventos recebidos · atualiza a cada 5s
              {dataUpdatedAt ? ` · última vez ${format(new Date(dataUpdatedAt), "HH:mm:ss")}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 border-b">
            <span className="w-4" />
            <span className="w-36">Data/Hora</span>
            <span className="w-28">Evento</span>
            <span className="w-28">Instância</span>
            <span className="w-16">Direção</span>
            <span className="w-44">RemoteJid</span>
            <span className="flex-1">Texto</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-lg font-medium mb-1">Nenhum evento recebido ainda</p>
              <p className="text-sm">Configure o webhook da Evolution API para apontar para o endpoint <code className="bg-gray-100 px-1 rounded">debugWebhook</code></p>
            </div>
          ) : (
            logs.map(log => <LogRow key={log.id} log={log} />)
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Endpoint: <code className="bg-gray-100 px-1 rounded">/api/apps/[APP_ID]/functions/debugWebhook</code>
        </p>
      </div>
    </div>
  );
}