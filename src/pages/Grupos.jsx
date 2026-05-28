import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Grupos() {
  const queryClient = useQueryClient();

  const { data: rawContacts = [], isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-last_contact_date"),
    refetchInterval: 2000,
    staleTime: 0,
  });

  const groups = rawContacts.filter(c => c.phone && c.phone.includes("@g.us"));

  useEffect(() => {
    const unsubscribe = base44.entities.Contact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    });
    return unsubscribe;
  }, [queryClient]);

  return (
    <div className="h-full overflow-y-auto bg-[#f0f2f5] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#00a884]" />
          <h1 className="text-xl font-bold text-[#111b21]">Grupos WhatsApp</h1>
        </div>
        <Button size="sm" className="bg-[#00a884] hover:bg-[#02906f]" disabled={isLoading} onClick={() => {}}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Carregando..." : "Atualizado"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">Erro ao carregar grupos</div>
      )}

      {groups.length === 0 && !isLoading && !error ? (
        <div className="bg-white rounded-xl p-10 text-center shadow-sm">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="font-semibold text-gray-700 mb-2">Grupos WhatsApp</h3>
          <p className="text-sm text-gray-500 mb-4">Envie uma mensagem em um grupo para que ele apareça aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {(g.name || g.phone)?.[0]?.toUpperCase() || "G"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#111b21] truncate">{g.name || g.phone}</p>
                <p className="text-xs text-gray-500">{g.phone}</p>
                {g.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{g.notes}</p>}
              </div>
              <MessageCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}