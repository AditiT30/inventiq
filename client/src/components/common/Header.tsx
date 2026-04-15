import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { logout } from "@/lib/api";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/products" },
  { label: "Sales", href: "/sales" },
  { label: "Purchases", href: "/purchases" },
  { label: "Manufacturing", href: "/manufacturing" },
  { label: "History", href: "/history" },
];

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20  bg-[#0d0d0b]/88 px-5 py-4 backdrop-blur-2xl sm:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-4">
        <div className="shell-header-panel flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3 sm:px-5">


          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <SidebarTrigger className="rounded-full border border-white/10  text-slate-300 hover:bg-white/[0.08] hover:text-white" />
            {/*<div className="hidden size-11 items-center justify-center rounded-[1.15rem] border border-white/8 bg-white/[0.04] text-slate-300 sm:flex">*/}
            {/*  <LayoutGrid className="size-4.5" />*/}
            {/*</div>*/}
            <div className="min-w-0">
              <div className="mt-1 text-[1.05rem] font-poppins font-semibold tracking-[-0.035em] text-white sm:text-[1.2rem]">Inventiq</div>
            </div>
          </div>
          <nav className="overflow-x-auto">
            <div className="shell-nav-row hidden  md:flex min-w-max items-center gap-1.5 rounded-[1.6rem] px-2 py-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                            isActive
                                ? "bg-[#d6ff2e] text-[#161711] shadow-[0_0_24px_rgba(214,255,46,0.18)]"
                                : "text-[#878b7b] hover:bg-white/[0.04] hover:text-white"
                        }`}
                    >
                      {item.label}
                    </Link>
                );
              })}

            </div>

          </nav>
          {/*<div className="shell-search hidden min-w-[20rem] items-center gap-3 rounded-full px-4 py-2.5 text-sm text-[#727664] lg:flex">*/}
          {/*  <ScanSearch className="size-4 text-[#a2aa7d]" />*/}
          {/*  <span className="truncate">Scan products, orders, and telemetry...</span>*/}
          {/*</div>*/}

          <div className="flex items-center gap-2">

            {/*<button type="button" className="shell-icon-button">
              <Settings className="size-4" />
            </button>*/}
            <div className="flex size-9 items-center justify-center rounded-full border border-[#d6ff2e]/20 bg-[#d6ff2e]/10 text-xs font-semibold text-[#ecff96] shadow-[0_0_18px_rgba(214,255,46,0.14)]">
              AI
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="shell-logout-button"
            >
              <LogOut className="size-3.5" />
              Logout
            </button>
          </div>
        </div>


      </div>
    </header>
  );
}

export default Header;
