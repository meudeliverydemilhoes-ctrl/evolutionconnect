import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Grupos() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getGroups", {});
      setGroups(res.data?.groups || []);
    } catch (e) {
      setError("Não foi possível carregar os grupos. Verifique se o WhatsApp está conectado.");
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Grupos WhatsApp</h1>
        </div>
        <Button size="sm" className="bg-[#00a884] hover:bg-[#02906f]" onClick={fetchGroups} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Carregando..." : "Carregar Grupos"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      )}

      {groups.length === 0 && !loading && !error ? (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="font-semibold text-gray-700 mb-2">Grupos WhatsApp</h3>
          <p className="text-sm text-gray-500 mb-4">Clique em "Carregar Grupos" para buscar os grupos do WhatsApp conectado.</p>
          <Button className="bg-[#00a884] hover:bg-[#02906f]" onClick={fetchGroups}>
            <RefreshCw className="w-4 h-4 mr-2" /> Carregar Grupos
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {(g.name || g.id)?.[0]?.toUpperCase() || "G"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#111b21] truncate">{g.name || g.id}</p>
                <p className="text-xs text-gray-500">{g.participants?.length || 0} participantes</p>
                {g.description && <p className="text-xs text-gray-400 truncate mt-0.5">{g.description}</p>}
              </div>
              <MessageCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}