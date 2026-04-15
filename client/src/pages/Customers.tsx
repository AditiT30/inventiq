import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, Search, Users } from "lucide-react";

import { ModulePage } from "@/components/common/module-shell";
import { getCustomers, subscribeToLiveEvents, type CustomerDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CustomerRecord = {
  id: string;
  name: string;
  contact: string;
  address: string;
  segment: string;
  region: string;
  accountHealth: "Priority" | "Active" | "Watch";
  notes: string;
};

const healthClasses: Record<CustomerRecord["accountHealth"], string> = {
  Priority: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  Active: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  Watch: "border-rose-300/20 bg-rose-300/10 text-rose-100",
};

const mapCustomer = (customer: CustomerDto): CustomerRecord => {
  const city = customer.address.split(",")[0]?.trim() || "Regional";
  const segment =
    customer.name.toLowerCase().includes("retail")
      ? "Retail"
      : customer.name.toLowerCase().includes("supply")
        ? "Distribution"
        : "Industrial";
  const accountHealth =
    customer.name.length % 3 === 0 ? "Priority" : customer.name.length % 2 === 0 ? "Active" : "Watch";

  return {
    id: customer.customer_id,
    name: customer.name,
    contact: customer.contact,
    address: customer.address,
    segment,
    region: city,
    accountHealth,
    notes: `${customer.name} is mapped to the ${segment.toLowerCase()} segment with operations centered around ${city}.`,
  };
};

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="ops-telemetry px-5 py-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">{label}</div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-3 text-sm leading-7 text-[#989d89]">{helper}</div>
    </div>
  );
}

function HealthBadge({ value }: { value: CustomerRecord["accountHealth"] }) {
  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${healthClasses[value]}`}>{value}</Badge>;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveTick, setLiveTick] = useState(0);

  // Customer reference data can change in another session while this list stays open.
  useEffect(() => subscribeToLiveEvents(["customers"], () => {
    setLiveTick((current) => current + 1);
  }), []);

  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getCustomers();

        if (!active) {
          return;
        }

        const mapped = data.map(mapCustomer);
        setCustomers(mapped);
        setSelectedCustomerId((current) => current || mapped[0]?.id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      active = false;
    };
  }, [liveTick]);

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!normalizedQuery) {
        return true;
      }

      return [customer.id, customer.name, customer.segment, customer.region].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [customers, query]);

  useEffect(() => {
    setSelectedCustomerId((current) => {
      if (visibleCustomers.some((customer) => customer.id === current)) {
        return current;
      }

      return visibleCustomers[0]?.id || "";
    });
  }, [visibleCustomers]);

  const selectedCustomer = visibleCustomers.find((customer) => customer.id === selectedCustomerId) ?? visibleCustomers[0];
  const priorityCount = customers.filter((customer) => customer.accountHealth === "Priority").length;

  return (
    <ModulePage>
      <section className="ops-board p-6 lg:p-7">
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="max-w-3xl">
            <div className="ops-kicker">Customer network</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Customer Ops</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#a3a893]">
              Search customer accounts, review contact context, and keep sales-facing relationships visible in the same control-room layout.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatTile label="Customer accounts" value={String(customers.length).padStart(2, "0")} helper="Tracked in the shared operations stack" />
            <StatTile label="Priority" value={String(priorityCount).padStart(2, "0")} helper="Accounts needing regular follow-up" />
            <StatTile label="Regions" value={String(new Set(customers.map((customer) => customer.region)).size).padStart(2, "0")} helper="Active geographic clusters" />
          </div>
        </div>
      </section>

      <section className="grid gap-7 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="ops-panel rounded-[32px] py-0">
          <CardHeader className="space-y-6 px-8 pt-8">
            <div>
              <CardTitle className="text-xl font-semibold text-white">Customers</CardTitle>
              <p className="mt-3 text-sm leading-7 text-[#969b88]">Look up customer IDs, segment visibility, and regional account context.</p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by customer ID, name, segment, or region"
                className="h-12 rounded-full border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-[#656a58]"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-8 pb-8">
            {loading ? <div className="text-sm text-slate-400">Loading customers...</div> : null}
            {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

            {!loading &&
              !error &&
              visibleCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className="ops-queue-card w-full p-5 text-left"
                  data-active={selectedCustomer?.id === customer.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold tracking-[-0.02em] text-white">{customer.name}</div>
                      <div className="mt-1 text-sm text-[#8f947f]">{customer.id} • {customer.segment}</div>
                    </div>
                    <HealthBadge value={customer.accountHealth} />
                  </div>
                  <div className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
                    <div>
                      <div className="text-[#6f745d]">Region</div>
                      <div className="mt-1 font-medium text-white">{customer.region}</div>
                    </div>
                    <div>
                      <div className="text-[#6f745d]">Contact</div>
                      <div className="mt-1 font-medium text-white">{customer.contact}</div>
                    </div>
                  </div>
                </button>
              ))}

            {!loading && !error && visibleCustomers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-slate-400">
                No customers matched that search.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedCustomer ? (
          <Card className="ops-panel h-full rounded-[32px] py-0">
            <CardHeader className="px-8 pt-8">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-3xl font-semibold tracking-[-0.05em] text-white">{selectedCustomer.name}</CardTitle>
                  <HealthBadge value={selectedCustomer.accountHealth} />
                </div>
                <p className="text-sm text-[#8d927e]">{selectedCustomer.id} • {selectedCustomer.segment} • {selectedCustomer.region}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              <div className="grid gap-5 md:grid-cols-3">
                <StatTile label="Customer ID" value={selectedCustomer.id} helper="Primary reference for sales workflow" />
                <StatTile label="Segment" value={selectedCustomer.segment} helper="Operational grouping for order planning" />
                <StatTile label="Region" value={selectedCustomer.region} helper="Current account geography" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
                <div className="ops-telemetry rounded-[28px] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Account contact</h3>
                  <div className="mt-6 space-y-5 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Account name</div>
                        <div className="mt-1">{selectedCustomer.name}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Contact number</div>
                        <div className="mt-1">{selectedCustomer.contact}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Address</div>
                        <div className="mt-1">{selectedCustomer.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ops-telemetry rounded-[28px] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Operational note</h3>
                  <p className="mt-5 text-sm leading-8 text-[#a0a591]">{selectedCustomer.notes}</p>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Sales readiness</span>
                      <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-slate-200">Mapped</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Credit review</span>
                      <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-slate-200">Internal</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Account health</span>
                      <HealthBadge value={selectedCustomer.accountHealth} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="ops-panel py-0">
            <CardContent className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-slate-400">
              {loading ? "Loading customer details..." : "Select a customer from the left panel to view its details."}
            </CardContent>
          </Card>
        )}
      </section>
    </ModulePage>
  );
}
