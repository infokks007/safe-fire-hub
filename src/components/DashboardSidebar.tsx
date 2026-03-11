import {
  Flame,
  Home,
  Plus,
  Package,
  Search,
  ShoppingBag,
  Store,
  Shield,
  Users,
  Settings,
  BarChart3,
  LogOut,
  MessageSquare,
  Wallet,
  ShieldAlert,
  Newspaper,
  DollarSign,
  Gavel,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const sellerNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Listings", url: "/dashboard/listings", icon: Package },
  { title: "Create Listing", url: "/dashboard/listings/new", icon: Plus },
  { title: "Browse", url: "/dashboard/browse", icon: Search },
  { title: "Auctions", url: "/dashboard/auctions", icon: Gavel },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Messages", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Wallet", url: "/dashboard/wallet", icon: Wallet },
  { title: "News", url: "/dashboard/news", icon: Newspaper },
];

const buyerNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Browse", url: "/dashboard/browse", icon: Search },
  { title: "Auctions", url: "/dashboard/auctions", icon: Gavel },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Messages", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Wallet", url: "/dashboard/wallet", icon: Wallet },
  { title: "Disputes", url: "/dashboard/disputes", icon: ShieldAlert },
  { title: "News", url: "/dashboard/news", icon: Newspaper },
];

const adminNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Orders", url: "/dashboard/admin/orders", icon: ShoppingBag },
  { title: "All Listings", url: "/dashboard/admin/listings", icon: Package },
  { title: "Users", url: "/dashboard/admin/users", icon: Users },
  { title: "Analytics", url: "/dashboard/admin/analytics", icon: BarChart3 },
  { title: "Operations", url: "/dashboard/admin/transactions", icon: DollarSign },
  { title: "Browse", url: "/dashboard/browse", icon: Search },
  { title: "Messages", url: "/dashboard/chat", icon: MessageSquare },
];

export function DashboardSidebar() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const RoleIcon = role === "seller" ? Store : role === "admin" ? Shield : ShoppingBag;
  const navItems = role === "seller" ? sellerNav : role === "admin" ? adminNav : buyerNav;

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold text-lg text-gradient-flame">
              SALEFIRE
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display uppercase text-xs tracking-wider">
            {!collapsed && (role === "seller" ? "Seller" : role === "admin" ? "Admin" : "Buyer")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-display uppercase text-xs tracking-wider">
            {!collapsed && "Account"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard/settings"
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.display_name}</p>
              <div className="flex items-center gap-1">
                <RoleIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{role}</span>
              </div>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
