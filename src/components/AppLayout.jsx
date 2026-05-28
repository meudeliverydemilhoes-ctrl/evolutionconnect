import { Link, useLocation, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MessageCircle, LayoutDashboard, Kanban, Users, Bot, Bell, Trophy, BarChart2, Sparkles, Video, Zap, Settings } from "lucide-react";

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

const bottomNavItems = [
  { to: "/", icon: MessageCircle, label: "Conversas" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/central", icon: Sparkles, label: "Central IA" },
];

export default function AppLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation - Desktop */}
      <nav className="hidden md:flex bg-[#075e54] text-white items-center gap-0 overflow-x-auto flex-shrink-0 shadow-md" style={{ scrollbarWidth: "none" }}>
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

      {/* Top Bar - Mobile */}
      <div className="md:hidden flex items-center justify-between bg-[#075e54] text-white px-4 py-3 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-bold text-base">MeuCRM</span>
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-1 rounded hover:bg-white/10">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <div className="bg-[#075e54] p-4">
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5" />
                <span className="font-bold">MeuCRM</span>
              </div>
            </div>
            <nav className="flex flex-col py-2">
              {navItems.map(({ to, icon: Icon, label }) => {
                const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                      active
                        ? "bg-[#075e54]/10 text-[#075e54] font-semibold border-l-4 border-[#075e54]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden flex items-center bg-white border-t flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {bottomNavItems.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-[#075e54]" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-gray-400">
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </SheetTrigger>
        </Sheet>
      </nav>
    </div>
  );
}