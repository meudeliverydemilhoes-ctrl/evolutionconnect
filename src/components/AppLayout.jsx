import { Link, useLocation, Outlet } from "react-router-dom";
import { MessageCircle, LayoutDashboard, Kanban, Users, Bot, Bell, Trophy, BarChart2, Brain, Sparkles, Video, Zap, Settings, Wifi } from "lucide-react";

const navItems = [
  { to: "/", icon: MessageCircle, label: "Conversas" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/grupos", icon: Users, label: "Grupos" },
  { to: "/chatbot", icon: Bot, label: "Chatbot" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/scorecard", icon: Trophy, label: "Scorecard" },
  { to: "/relatorios", icon: BarChart2, label: "Relatórios" },
  { to: "/central", icon: Sparkles, label: "Central IA" },
  { to: "/reunioes", icon: Video, label: "Reuniões" },
  { to: "/fluxos", icon: Zap, label: "Fluxos" },
  { to: "/whatsapp-setup", icon: Settings, label: "Config" },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-[#075e54] text-white flex items-center gap-0 overflow-x-auto flex-shrink-0 shadow-md" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-2 px-4 py-2 border-r border-white/20 flex-shrink-0">
          <MessageCircle className="w-5 h-5" />
          <span className="font-bold text-sm whitespace-nowrap">MeuCRM</span>
        </div>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                active
                  ? "bg-white/20 border-white text-white font-semibold"
                  : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
}