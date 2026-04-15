import { ArrowRight, Boxes, ChartNoAxesCombined, ClipboardList, Factory, ShieldCheck, Sparkles, Truck } from "lucide-react";

import ProductAssistant from "@/components/common/ProductAssistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "Inventory accuracy", value: "99.2%" },
  { label: "Order response time", value: "< 4 min" },
  { label: "Production visibility", value: "24/7" },
];

const capabilities = [
  {
    title: "Real-time inventory control",
    description: "Track raw materials, finished goods and every stock movement without waiting for manual reconciliation.",
    icon: Boxes,
  },
  {
    title: "Production Workflows",
    description: "Sync manufacturing, replenishment and dispatch in one operational rhythm built for busy floors.",
    icon: Factory,
  },
  {
    title: "Actionable demand signals",
    description: "See what is moving, what is stalling and where replenishment decisions need attention first.",
    icon: ChartNoAxesCombined,
  },
];

const workflow = [
  {
    step: "01",
    title: "Receive and organize",
    description: "Log intake quickly and make every incoming unit traceable from the first scan.",
    icon: Truck,
  },
  {
    step: "02",
    title: "Move through production",
    description: "Watch materials flow through operations with a live view of work-in-progress and bottlenecks.",
    icon: ClipboardList,
  },
  {
    step: "03",
    title: "Ship with confidence",
    description: "Fulfill sales orders with accurate stock positions and fewer last-minute surprises.",
    icon: ShieldCheck,
  },
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-[#d6ff2e]">
      <Sparkles className="size-3" />
      <span>{children}</span>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="landing-glass-card rounded-[26px] border border-white/10 px-6 py-6">
      <div className="text-[2rem] font-semibold tracking-[-0.06em] text-white">{value}</div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#b4ba9f]">{label}</div>
    </div>
  );
}

function Body() {
  return (
    <main className="min-h-screen bg-transparent pb-12 text-white font-poppins">
      <section className="relative overflow-hidden">
        <div className="landing-hero relative min-h-[calc(100vh-7.5rem)] overflow-hidden">
          <img
            src="/hero_image.png"
            alt="Industrial hero scene"
            className="landing-hero-image absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="landing-hero-overlay absolute inset-0" />
          <div className="landing-hero-atmosphere absolute inset-0" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#090907] via-[#090907]/78 to-transparent" />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-7.5rem)] max-w-[92rem] items-start px-6 py-12 sm:px-8 lg:px-12 lg:py-16 xl:items-center">
            <div className="max-w-[44rem]">
              <SectionEyebrow>Industrial intelligence layer</SectionEyebrow>
              <h1 className="soft-type mt-8 max-w-[11ch] text-5xl font-semibold leading-[0.88] tracking-[-0.08em] text-white sm:text-6xl lg:text-7xl xl:text-[5.8rem]">
                Own the <span className="text-[#d6ff2e]">outcome</span>
              </h1>
              <p className="mt-7 max-w-[40rem] text-base leading-8 text-[#b6bb9f] sm:text-lg sm:leading-9">
                Inventiq brings stock, purchasing, production and dispatch into one calm operational surface that feels precise, readable and built for industrial flow.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild className="neon-pill h-12 rounded-full px-7 text-sm font-semibold hover:opacity-80">
                  <a href="/dashboard">
                    Open dashboard
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-full border-white/15 bg-black/20 px-7 text-sm font-medium text-white backdrop-blur-xl hover:opacity-80"
                >
                  <a href="#capabilities">Explore features</a>
                </Button>
              </div>

              <div className="mt-12 grid max-w-[58rem] gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <HeroMetric key={metric.label} {...metric} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[92rem] px-6 py-14 sm:px-8 lg:px-12 lg:py-18">
        <div className="max-w-2xl">
          <SectionEyebrow>Core capabilities</SectionEyebrow>
          <h2 className="mt-7 text-4xl font-semibold tracking-[-0.05em] text-white">Built for teams that need speed with breathing room.</h2>
          <p className="mt-5 text-lg leading-9 text-[#a5ab96]">
            Every section is designed to stay readable under pressure while still feeling premium and operationally sharp.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 ">
          {capabilities.map((capability) => (
            <article
              key={capability.title}
              className={`landing-glass-card rounded-[30px] border p-8 shadow-[0_20px_60px_rgba(2,6,23,0.22)] border-gray-500/10 hover:scale-105 `}
            >
              <div className="mb-6 inline-flex rounded-2xl border border-[#d6ff2e]/20 bg-[#d6ff2e]/10 p-3 text-[#eff8ca]">
                <capability.icon className="size-5" />
              </div>
              <h3 className="text-[1.8rem] font-semibold tracking-[-0.05em] text-white">{capability.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#9ea48e]">{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-6 py-10 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-10 max-w-2xl">
          <SectionEyebrow>Workflow visibility</SectionEyebrow>
          <h2 className="mt-7 text-4xl font-semibold tracking-[-0.05em] text-white">Follow the movement from intake to fulfillment.</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 ">
          {workflow.map((item) => (
            <article key={item.step} className="landing-glass-card rounded-[30px] border border-white/10 p-8 hover:scale-105">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium tracking-[0.24em] text-[#6c705d]">{item.step}</span>
                <div className="rounded-full border border-[#d6ff2e]/15 bg-[#d6ff2e]/10 p-2 text-[#d6ff2e]">
                  <item.icon className="size-4" />
                </div>
              </div>
              <h3 className="mt-9 text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#9ea48d]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-[92rem] px-6 pt-4 sm:px-8 lg:px-12">
        <Card className="landing-glass-card rounded-[34px] border border-white/10 bg-white/[0.03] py-0 shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
          <CardContent className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr]">
              <div className="max-w-xl">
                <div className="text-3xl font-semibold tracking-[-0.06em] text-white">Inventiq</div>
                <p className="mt-4 text-sm leading-8 text-[#a9af98]">
                  Industrial inventory intelligence for electronic components and finished goods, built to keep
                  purchasing, production, and dispatch on one precise operating rhythm.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="neon-pill h-11 rounded-full px-6 text-sm font-semibold hover:opacity-80">
                    <a href="/dashboard">Launch workspace</a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full border-white/15 bg-white/[0.03] px-6 text-sm font-medium text-white hover:opacity-80"
                  >
                    <a href="/history">View live log</a>
                  </Button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-[0.26em] text-[#d6ff2e]">Platform</div>
                <div className="mt-4 space-y-3 text-sm text-[#b6bc9f]">
                  <a href="/dashboard" className="block transition hover:text-white">
                    Dashboard
                  </a>
                  <a href="/products" className="block transition hover:text-white">
                    Products
                  </a>
                  <a href="/manufacturing" className="block transition hover:text-white">
                    Manufacturing
                  </a>
                  <a href="/history" className="block transition hover:text-white">
                    History
                  </a>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-[0.26em] text-[#d6ff2e]">Operations</div>
                <div className="mt-4 space-y-3 text-sm text-[#b6bc9f]">
                  <a href="/sales" className="block transition hover:text-white">
                    Sales orders
                  </a>
                  <a href="/purchases" className="block transition hover:text-white">
                    Purchase orders
                  </a>
                  <a href="/customers" className="block transition hover:text-white">
                    Customers
                  </a>
                  <a href="/suppliers" className="block transition hover:text-white">
                    Suppliers
                  </a>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-[0.26em] text-[#d6ff2e]">Trust</div>
                <div className="mt-4 space-y-3 text-sm text-[#b6bc9f]">
                  <div>Secure session controls</div>
                  <div>Live operational sync</div>
                  <div>AI-assisted product intelligence</div>
                  <div>Audit-ready event history</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-5 text-xs uppercase tracking-[0.18em] text-[#717762] sm:flex-row sm:items-center sm:justify-between">
              <div>2026 Inventiq industrial systems</div>
              <div className="flex flex-wrap gap-4 sm:justify-end">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>Support</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </footer>

      <ProductAssistant variant="popup" />
    </main>
  );
}

export default Body;
