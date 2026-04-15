import { Suspense, lazy } from "react";
import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router-dom";

import { isAuthenticated } from "@/lib/api";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "./components/common/Header.tsx";
import Body from "./pages/Body.tsx";
import Customers from "./pages/Customers.tsx";
import History from "./pages/History.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import Manufacturing from "./pages/Manufacturing.tsx";
import PurchaseOrders from "./pages/PurchaseOrders.tsx";
import Products from "./pages/Products.tsx";
import SalesOrders from "./pages/SalesOrders.tsx";
import Suppliers from "./pages/Suppliers.tsx";
import AppSidebar from "@/components/common/AppSidebar.tsx";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));

function DashboardRouteFallback() {
  return (
    <main className="min-h-screen bg-transparent px-6 pb-14 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-8">
        <div className="ops-board p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_1.02fr]">
            <div className="space-y-5">
              <Skeleton className="h-6 w-36 rounded-full bg-white/8" />
              <Skeleton className="h-20 w-72 rounded-[28px] bg-white/8" />
              <Skeleton className="h-8 w-full max-w-xl rounded-[20px] bg-white/8" />
              <Skeleton className="h-12 w-40 rounded-full bg-white/8" />
            </div>
            <Skeleton className="h-[24rem] rounded-[30px] bg-white/8" />
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-[30px] bg-white/8" />
          ))}
        </section>
      </div>
    </main>
  );
}

function RequireAuth() {
  const location = useLocation();

  if (!isAuthenticated()) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace state={{ from: redirect }} />;
  }

  return <Outlet />;
}

const App = () => {
  return (
    <SidebarProvider>
      <div className="industrial-shell min-h-screen w-full text-white md:flex md:h-screen md:overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
          <Header />
          <div className="flex-1 md:overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <App />,
        children: [
          {
            path: "/",
            element: <Body />,
          },
          {
            path: "/dashboard",
            element: (
              <Suspense fallback={<DashboardRouteFallback />}>
                <Dashboard />
              </Suspense>
            ),
          },
          {
            path: "/products",
            element: <Products />,
          },
          {
            path: "/customers",
            element: <Customers />,
          },
          {
            path: "/suppliers",
            element: <Suppliers />,
          },
          {
            path: "/sales",
            element: <SalesOrders />,
          },
          {
            path: "/purchases",
            element: <PurchaseOrders />,
          },
          {
            path: "/manufacturing",
            element: <Manufacturing />,
          },
          {
            path: "/history",
            element: <History />,
          },
        ],
      },
    ],
  },
]);

export default App;
