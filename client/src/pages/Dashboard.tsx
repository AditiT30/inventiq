import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Factory,
  PackageCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, getDashboardSummary, subscribeToLiveEvents, type DashboardSummaryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "amber" | "emerald" | "sky" | "rose";

const quickActions: Array<{
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    title: "Review products",
    description: "Update stock coverage and monitor low-quantity SKUs.",
    href: "/products",
    icon: PackageCheck,
  },
  {
    title: "Track sales",
    description: "See dispatch-ready orders and customer commitments.",
    href: "/sales",
    icon: ClipboardList,
  },
  {
    title: "Manage purchasing",
    description: "Follow incoming supplies and supplier timelines.",
    href: "/purchases",
    icon: Truck,
  },
];

const cardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Inventory value": Boxes,
  "Pending orders": ShoppingCart,
  "WIP status": Factory,
};

const toneStyles: Record<Tone, string> = {
  amber: "border-[#d6ff2e]/20 bg-[#d6ff2e]/10 text-[#eff8ca]",
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  sky: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  rose: "border-orange-400/20 bg-orange-500/10 text-orange-100",
};

function DashboardHero({ inventoryValue, chartData }: { inventoryValue: string; chartData: Array<{ name: string; value: number }> }) {
  return (
    <section className="ops-board p-8 lg:p-10">
      <div className="relative grid gap-8 xl:grid-cols-[1fr_1.02fr]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d6ff2e]">
              <Activity className="size-3.5" />
              Operational overview
            </div>
            <div className="mt-8 text-6xl font-semibold tracking-[-0.06em] text-white lg:text-7xl">{inventoryValue}</div>
            <p className="mt-5 max-w-xl text-2xl leading-tight text-[#d2d8c0]">
              Total portfolio value across inventory, orders, and manufacturing lanes.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button asChild className="neon-pill h-12 rounded-full px-7 text-sm font-semibold hover:opacity-95">
              <a href="/products">
                Open products
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white hover:bg-white/[0.06]"
            >
              <a href="/history">View history</a>
            </Button>
          </div>
        </div>

        <div className="ops-panel rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Live telemetry</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Operations pulse</h2>
            </div>
            <div className="rounded-full border border-[#d6ff2e]/20 bg-[#d6ff2e]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#eff8ca]">
              Live
            </div>
          </div>
          <div className="mt-8 h-[20rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="inventoryGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d6ff2e" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#d6ff2e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,12,0.96)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    color: "#f5f7eb",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#d6ff2e" strokeWidth={3} fill="url(#inventoryGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-[#d6ff2e]/15 bg-[#d6ff2e]/10 p-3 text-[#eff8ca]">
            <Icon className="size-5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6ff2e]">Live</span>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="text-[11px] uppercase tracking-[0.24em] text-[#6f745d]">{title}</div>
        <div className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">{value}</div>
        <div className="mt-3 text-sm leading-7 text-[#9ea48d]">{change}</div>
      </CardContent>
    </Card>
  );
}

function WorkCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="ops-panel rounded-[28px] py-0">
      <CardContent className="px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-[#d6ff2e]">
            <Icon className="size-5" />
          </div>
          <Button asChild variant="ghost" className="rounded-full px-0 text-[#bcc2a4] hover:bg-transparent hover:text-white">
            <a href={href}>
              Open
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
        <div className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">{title}</div>
        <div className="mt-3 text-sm leading-7 text-[#959b86]">{description}</div>
      </CardContent>
    </Card>
  );
}

function FeedPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneStyles[tone]}`}>{label}</span>;
}

function FeedRow({
  primary,
  secondary,
  tertiary,
  status,
  tone,
}: {
  primary: string;
  secondary: string;
  tertiary: string;
  status: string;
  tone: Tone;
}) {
  return (
    <div className="ops-telemetry p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{primary}</div>
          <div className="mt-1 text-sm text-[#868b77]">{secondary}</div>
        </div>
        <div className="text-sm text-[#b9bea8]">{tertiary}</div>
        <FeedPill label={status} tone={tone} />
      </div>
    </div>
  );
}

function StatsChart({ stockSignals }: Pick<DashboardSummaryDto, "stockSignals">) {
  const data = stockSignals.map((signal) => ({
    name: signal.label.replace(" alerts", "").replace(" requiring action", ""),
    value: Number(signal.value),
  }));

  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Signal distribution</CardTitle>
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6ff2e]">Realtime</span>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="h-[16rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={10}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,15,12,0.96)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  color: "#f5f7eb",
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#d6ff2e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const pieToneColors: Record<Tone, string> = {
  amber: "#d6ff2e",
  emerald: "#5ee58a",
  sky: "#62b5ff",
  rose: "#ff7f7f",
};

function TrendChart({ data }: { data: DashboardSummaryDto["salesPurchasesTrend"] }) {
  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Sales vs purchases trend</CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#d6ff2e" strokeWidth={3} dot={{ r: 4 }} name="Sales" />
              <Line type="monotone" dataKey="purchases" stroke="#62b5ff" strokeWidth={3} dot={{ r: 4 }} name="Purchases" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineChart({ data }: { data: DashboardSummaryDto["statusPipeline"] }) {
  const salesTotal = Object.values(data.sales).reduce((sum, value) => sum + value, 0);
  const purchaseTotal = Object.values(data.purchases).reduce((sum, value) => sum + value, 0);
  const manufacturingTotal = Object.values(data.manufacturing).reduce((sum, value) => sum + value, 0);
  const totalsData = [
    { value: salesTotal, name: "Sales", fill: "#d6ff2e" },
    { value: purchaseTotal, name: "Purchases", fill: "#62b5ff" },
    { value: manufacturingTotal, name: "Manufacturing", fill: "#8d8dff" },
  ];

  const stackedData = [
    {
      name: "Sales",
      quotation: data.sales.quotation,
      packing: data.sales.packing,
      dispatch: data.sales.dispatch,
      history: data.sales.history,
    },
    {
      name: "Purchases",
      quotation: data.purchases.quotations,
      unpaid: data.purchases.unpaid,
      paid: data.purchases.paid,
      completion: data.purchases.completion,
      history: data.purchases.history,
    },
    {
      name: "Manufacturing",
      planned: data.manufacturing.planned,
      inProgress: data.manufacturing.inProgress,
      completed: data.manufacturing.completed,
      delayed: data.manufacturing.delayed,
    },
  ];

  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Order status pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-7 pb-7">
        <div className="h-[14rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totalsData} layout="vertical" margin={{ left: 18, right: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: "#e8edd5", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value) => [Number(value ?? 0), "Active items"]}
                contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {totalsData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-[16rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }} />
              <Legend />
              <Bar dataKey="quotation" stackId="a" fill="#62b5ff" name="Quotation" />
              <Bar dataKey="packing" stackId="a" fill="#d6ff2e" name="Packing" />
              <Bar dataKey="dispatch" stackId="a" fill="#5ee58a" name="Dispatch" />
              <Bar dataKey="unpaid" stackId="a" fill="#ff7f7f" name="Unpaid" />
              <Bar dataKey="paid" stackId="a" fill="#ffb84d" name="Paid" />
              <Bar dataKey="completion" stackId="a" fill="#7cffd4" name="Completion" />
              <Bar dataKey="planned" stackId="a" fill="#8d8dff" name="Planned" />
              <Bar dataKey="inProgress" stackId="a" fill="#d6ff2e" name="In progress" />
              <Bar dataKey="completed" stackId="a" fill="#5ee58a" name="Completed" />
              <Bar dataKey="delayed" stackId="a" fill="#ff7f7f" name="Delayed" />
              <Bar dataKey="history" stackId="a" fill="#9aa08d" name="History" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  );
}

function TopCustomersChart({ data }: { data: DashboardSummaryDto["topCustomers"] }) {
  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Revenue concentration by top customers</CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="h-[19rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#858b75", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#e8edd5", fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(value, name) =>
                  name === "revenue"
                    ? [formatCurrency(Number(value ?? 0)), "Revenue"]
                    : [Number(value ?? 0), "Orders"]
                }
                contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#d6ff2e" radius={[0, 8, 8, 0]} name="Revenue" />
              <Bar dataKey="orders" fill="#62b5ff" radius={[0, 8, 8, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryHealthChart({ data }: { data: DashboardSummaryDto["inventoryHealth"] }) {
  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Inventory health overview</CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" outerRadius={95} innerRadius={50} paddingAngle={3}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={pieToneColors[entry.tone]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ContributionDonut({
  title,
  leader,
  leaderShare,
  otherShare,
  accent,
  valueLabel,
}: {
  title: string;
  leader: string;
  leaderShare: number;
  otherShare: number;
  accent: string;
  valueLabel: string;
}) {
  return (
    <Card className="ops-panel rounded-[30px] py-0">
      <CardHeader className="px-7 pt-7">
        <CardTitle className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <div className="h-[14rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: leader, value: leaderShare },
                  { name: "Other", value: otherShare },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={3}
              >
                <Cell fill={accent} />
                <Cell fill="rgba(255,255,255,0.12)" />
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(15,15,12,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#f5f7eb" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="-mt-2 text-center">
          <div className="text-4xl font-semibold tracking-[-0.05em] text-white">{leaderShare}%</div>
          <div className="mt-2 text-sm text-[#98a08b]">{leader}</div>
          <div className="mt-1 text-sm text-[#cdd2bc]">{valueLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeferredChartsPlaceholder() {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <Skeleton className="h-[28rem] rounded-[30px] bg-white/8" />
        <Skeleton className="h-[28rem] rounded-[30px] bg-white/8" />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[24rem] rounded-[30px] bg-white/8" />
        <Skeleton className="h-[24rem] rounded-[30px] bg-white/8" />
      </section>
    </>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveTick, setLiveTick] = useState(0);
  const [showSecondaryCharts, setShowSecondaryCharts] = useState(false);

  // Reuse the existing load effect by bumping a simple counter on live dashboard events.
  useEffect(() => subscribeToLiveEvents(["dashboard"], () => {
    setLiveTick((current) => current + 1);
  }), []);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getDashboardSummary();

        if (!active) {
          return;
        }

        setSummary(data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard summary.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [liveTick]);

  // Defer lower-priority chart groups so the hero, summary cards, and primary trend views paint first.
  useEffect(() => {
    if (loading || error || !summary) {
      setShowSecondaryCharts(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSecondaryCharts(true);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error, loading, summary]);

  const summaryCards = summary?.summaryCards ?? [];
  const salesPressure = summary?.salesPressure ?? [];
  const wipBatches = summary?.wipOverview ?? [];
  const stockSignals = summary?.stockSignals ?? [];
  const salesPurchasesTrend = summary?.salesPurchasesTrend ?? [];
  const statusPipeline = summary?.statusPipeline;
  const topCustomers = summary?.topCustomers ?? [];
  const inventoryHealth = summary?.inventoryHealth ?? [];
  const contributionSplit = summary?.contributionSplit;
  const inventoryValue = summaryCards.find((card) => card.title === "Inventory value")?.value ?? 0;

  const chartData = useMemo(
    () =>
      summaryCards.map((card) => ({
        name: card.title.replace(" value", "").replace(" status", ""),
        value: card.value,
      })),
    [summaryCards]
  );

  return (
    <main className="min-h-screen bg-transparent px-6 pb-14 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-8">
        <DashboardHero inventoryValue={formatCurrency(inventoryValue)} chartData={chartData} />

        {loading ? (
          <div className="ops-panel rounded-[28px] px-6 py-12 text-center text-sm text-[#b0b59f]">
            Loading dashboard summary...
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-orange-400/20 bg-orange-500/10 px-6 py-12 text-center text-sm text-orange-100">
            {error}
          </div>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <SummaryMetric
                  key={card.title}
                  title={card.title}
                  value={card.title === "Inventory value" ? formatCurrency(card.value) : card.title === "WIP status" ? `${card.value} active batches` : String(card.value)}
                  change={card.change}
                  icon={cardIcons[card.title] ?? Boxes}
                />
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
              <TrendChart data={salesPurchasesTrend} />
              {statusPipeline ? <PipelineChart data={statusPipeline} /> : null}
            </section>

            {showSecondaryCharts ? (
              <>
                <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
                  <TopCustomersChart data={topCustomers} />
                  <InventoryHealthChart data={inventoryHealth} />
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                  {contributionSplit ? (
                    <>
                      <ContributionDonut
                        title="Top customer contribution"
                        leader={contributionSplit.customers.leader}
                        leaderShare={contributionSplit.customers.leaderShare}
                        otherShare={contributionSplit.customers.otherShare}
                        accent="#d6ff2e"
                        valueLabel={formatCurrency(contributionSplit.customers.leaderValue)}
                      />
                      <ContributionDonut
                        title="Top supplier contribution"
                        leader={contributionSplit.suppliers.leader}
                        leaderShare={contributionSplit.suppliers.leaderShare}
                        otherShare={contributionSplit.suppliers.otherShare}
                        accent="#62b5ff"
                        valueLabel={formatCurrency(contributionSplit.suppliers.leaderValue)}
                      />
                    </>
                  ) : null}
                </section>
              </>
            ) : (
              <DeferredChartsPlaceholder />
            )}

            <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
              <div className="space-y-6">
                <Card className="ops-panel rounded-[30px] py-0">
                  <CardHeader className="px-7 pt-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Operational modules</CardTitle>
                        <p className="mt-2 text-sm leading-7 text-[#909581]">Jump into the modules used most often by operations teams.</p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6ff2e]">Control map</span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5 px-7 pb-7 lg:grid-cols-3">
                    {quickActions.map((action) => (
                      <WorkCard key={action.title} {...action} />
                    ))}
                  </CardContent>
                </Card>

                <Card className="ops-panel rounded-[30px] py-0">
                  <CardHeader className="px-7 pt-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Sales pressure</CardTitle>
                        <p className="mt-2 text-sm leading-7 text-[#8f947f]">Orders that need attention across fulfillment and stock readiness.</p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6ff2e]">{salesPressure.length} active</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-7 pb-7">
                    {salesPressure.map((order) => (
                      <FeedRow
                        key={order.id}
                        primary={order.id}
                        secondary={order.customer}
                        tertiary={order.amount}
                        status={order.status}
                        tone={order.tone}
                      />
                    ))}
                    {salesPressure.length === 0 ? (
                      <div className="ops-telemetry p-4 text-sm text-[#8f947f]">
                        No recent sales orders available yet.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <StatsChart stockSignals={stockSignals} />

                <Card className="ops-panel rounded-[30px] py-0">
                  <CardHeader className="px-7 pt-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">Work in progress</CardTitle>
                        <p className="mt-2 text-sm leading-7 text-[#8f947f]">Manufacturing batches visible at a glance.</p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d6ff2e]">{wipBatches.length} live</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 px-7 pb-7">
                    {wipBatches.map((batch) => (
                      <FeedRow
                        key={batch.batch}
                        primary={batch.batch}
                        secondary={batch.line}
                        tertiary={batch.completion}
                        status={batch.status}
                        tone={batch.tone}
                      />
                    ))}
                    {wipBatches.length === 0 ? (
                      <div className="glass-panel rounded-[24px] border border-white/8 p-4 text-sm text-[#8f947f]">
                        No manufacturing batches are available yet.
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default Dashboard;
