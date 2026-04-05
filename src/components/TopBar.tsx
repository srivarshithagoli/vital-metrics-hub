import { Search, Bell, Sun, Moon, User, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.displayName || user?.email || "Admin";

  const handleLogOut = async () => {
    try {
      await logOut();
      toast.success("Signed out successfully.");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Unable to sign out right now. Please try again.");
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h2 className="text-sm font-medium text-muted-foreground hidden sm:block">
          City General Hospital
        </h2>
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients, records..."
            className="pl-9 h-9 bg-secondary border-none text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm hidden sm:inline">{displayName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>Account Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogOut}>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
