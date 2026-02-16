import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  FolderOpen,
  FileText,
  Settings,
  Baby,
  ChevronRight,
  Activity,
} from "lucide-react";

const sidebarItems = [
  { title: "Home", path: "/", icon: Home },
  { title: "Dashboard", path: "/dashboard", icon: Baby },
  { title: "Cases", path: "/cases", icon: FolderOpen },
  { title: "Reports", path: "/reports", icon: FileText },
  { title: "Telemetry", path: "/telemetry", icon: Activity },
  { title: "Settings", path: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

const SIDEBAR_PATHS = ["/dashboard", "/cases", "/profile", "/reports", "/settings"];

export default function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const showSidebar = SIDEBAR_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  if (!showSidebar) return null;

  return (
    <aside
      className={cn(
        "w-60 border-r bg-sidebar flex flex-col hidden lg:flex",
        className
      )}
      role="navigation"
      aria-label="Sidebar"
    >
      <nav className="flex flex-col gap-1 p-4">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.title}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
