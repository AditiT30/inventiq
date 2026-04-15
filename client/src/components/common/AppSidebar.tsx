import {
  House,
  Building2,
  Factory,
  History,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Home", url: "/", icon: House },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Suppliers", url: "/suppliers", icon: Building2 },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Purchases", url: "/purchases", icon: Truck },
  { title: "Manufacturing", url: "/manufacturing", icon: Factory },
  { title: "History", url: "/history", icon: History },
];

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-[1.1rem]  bg-[#d6ff2e]/10 text-sm font-semibold text-[#ebff8f] shadow-[0_0_20px_rgba(214,255,46,0.08)]">
        IQ
      </div>
      <div className="min-w-0">
        <div className="truncate text-[1.45rem] font-semibold tracking-[-0.04em] text-[#d6ff2e]">Inventiq</div>

      </div>
    </div>
  );
}

function SidebarInner() {
  const location = useLocation();

  return (
    <>
      <SidebarHeader className="gap-4 bg-[#12110f] px-5 py-5">
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent className="shell-sidebar-content bg-[linear-gradient(180deg,#11100d_0%,#090907_100%)] px-3 py-4">
        <SidebarGroup className="p-0">
          {/*<div className="mx-2 mb-6 rounded-[1.7rem] border border-white/6 bg-[linear-gradient(180deg,rgba(214,255,46,0.1),rgba(255,255,255,0.015))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">*/}
          {/*  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9da57b]">Active sector</div>*/}
          {/*  <div className="mt-2 text-sm font-semibold text-[#f2f8d5]">Industrial Hub</div>*/}
          {/*  <div className="mt-1 text-xs text-[#798064]">Warehouse AI control plane</div>*/}
          {/*</div>*/}
          <SidebarGroupLabel className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#62664f]">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2.5">
              {items.map((item) => {
                const isActive = location.pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-12 rounded-[1.15rem] px-3.5 text-[#8a8d7d] transition-all duration-200 ease-out data-[active=true]:bg-[linear-gradient(90deg,rgba(125,151,17,0.34),rgba(44,48,24,0.78))] data-[active=true]:text-[#eff8ca] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(214,255,46,0.16),0_12px_28px_rgba(0,0,0,0.14)] hover:bg-white/[0.04] hover:text-white"
                    >
                      <Link to={item.url} className="flex w-full items-center gap-3">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl  ${isActive ? "border-[#d6ff2e]/12 bg-[#d6ff2e]/12 text-[#eff8ca]" : "border-white/6 bg-white/[0.02] text-[#9aa085]"}`}>
                          <item.icon className="size-4.5 shrink-0" />
                        </span>
                        <span className="truncate font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 mx-1 bg-white/6" />

        <div className="mx-2 mt-auto rounded-[1.7rem]  bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] p-4 text-sm text-[#b7bea2] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f745c]">System state</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Live inventory sync</span>
            <span className="size-2 rounded-full bg-[#d6ff2e] shadow-[0_0_14px_rgba(214,255,46,0.7)]" />
          </div>
          <div className="mt-2 leading-6 text-[#80866d]">Track products, orders, and WIP from one consistent industrial control shell.</div>
          <div className="mt-4 h-px bg-white/6" />
          <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#72785f]">
            <span>Latency</span>
            <span className="text-[#d7dfaf]">14 ms</span>
          </div>
        </div>
      </SidebarContent>
    </>
  );
}

export default function AppSidebar() {
  const { open } = useSidebar();

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 overflow-hidden  bg-[linear-gradient(180deg,#12110f_0%,#090907_100%)] transition-[width,opacity] duration-300 ease-out md:flex md:flex-col ${
          open ? "w-[14rem] opacity-100" : "w-0 border-r-0 opacity-0"
        }`}
      >
        <div className="h-full min-w-[14rem] overflow-y-auto">
          <SidebarInner />
        </div>
      </aside>

      <Sidebar collapsible="offcanvas" className="md:hidden">
        <SidebarInner />
      </Sidebar>
    </>
  );
}
