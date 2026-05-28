import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, RefreshCw, Search, GitBranch } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Issues() {
  const [repo, setRepo] = useState("");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const fetchIssues = async () => {
    if (!repo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getGithubIssues", { repo: repo.trim() });
      setIssues(res.data.issues || []);
      setSearched(true);
    } catch (e) {
      setError(e.message || "Erro ao buscar issues");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchIssues();
  };

  const labelColors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-red-100 text-red-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Issues do GitHub</h1>
          <p className="text-sm text-gray-500">Visualize as issues abertas de um repositório</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="owner/repositório  (ex: facebook/react)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={fetchIssues} disabled={loading || !repo.trim()}>
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="mb-4 text-sm text-gray-500">
          {issues.length === 0
            ? "Nenhuma issue aberta encontrada."
            : `${issues.length} issue${issues.length !== 1 ? "s" : ""} aberta${issues.length !== 1 ? "s" : ""}`}
        </div>
      )}

      <div className="space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">#{issue.number}</span>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-sm leading-snug"
                  >
                    {issue.title}
                  </a>
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </div>

                {/* Labels */}
                {issue.labels?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {issue.labels.map((label, idx) => (
                      <span
                        key={label.id}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${labelColors[idx % labelColors.length]}`}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>
                    Aberta em{" "}
                    {format(new Date(issue.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  {issue.user && (
                    <span className="flex items-center gap-1">
                      <img
                        src={issue.user.avatar_url}
                        alt={issue.user.login}
                        className="w-4 h-4 rounded-full"
                      />
                      {issue.user.login}
                    </span>
                  )}
                  {issue.comments > 0 && (
                    <span>{issue.comments} comentário{issue.comments !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>

              <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">open</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}