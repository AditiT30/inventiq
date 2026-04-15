import { useEffect, useMemo, useState } from "react";
import { Factory, MapPin, Phone, Search } from "lucide-react";

import { ModulePage } from "@/components/common/module-shell";
import { getSuppliers, subscribeToLiveEvents, type SupplierDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SupplierRecord = {
  id: string;
  name: string;
  contact: string;
  address: string;
  specialty: string;
  region: string;
  reliability: "Stable" | "Preferred" | "Watch";
  notes: string;
};

const reliabilityClasses: Record<SupplierRecord["reliability"], string> = {
  Preferred: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  Stable: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  Watch: "border-rose-300/20 bg-rose-300/10 text-rose-100",
};

const mapSupplier = (supplier: SupplierDto): SupplierRecord => {
  const city = supplier.address.split(",")[0]?.trim() || "Regional";
  const specialty =
    supplier.name.toLowerCase().includes("battery")
      ? "Energy systems"
      : supplier.name.toLowerCase().includes("silicon")
        ? "Semiconductors"
        : supplier.name.toLowerCase().includes("motion")
          ? "Power assemblies"
          : "Electronic components";
  const reliability =
    supplier.name.length % 3 === 0 ? "Preferred" : supplier.name.length % 2 === 0 ? "Stable" : "Watch";

  return {
    id: supplier.supplier_id,
    name: supplier.name,
    contact: supplier.contact,
    address: supplier.address,
    specialty,
    region: city,
    reliability,
    notes: `${supplier.name} currently supports ${specialty.toLowerCase()} sourcing with routing through ${city}.`,
  };
};

function StatTile({
  label,
  value,
  helper,
  compact = false,
}: {
  label: string;
  value: string;
  helper: string;
  compact?: boolean;
}) {
  return (
    <div className="ops-telemetry px-5 py-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">{label}</div>
      <div className={`mt-4 font-semibold tracking-[-0.04em] text-white ${compact ? "text-xl xl:text-2xl break-words" : "text-3xl"}`}>{value}</div>
      <div className="mt-3 text-sm leading-7 text-[#989d89]">{helper}</div>
    </div>
  );
}

function ReliabilityBadge({ value }: { value: SupplierRecord["reliability"] }) {
  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${reliabilityClasses[value]}`}>{value}</Badge>;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveTick, setLiveTick] = useState(0);

  // Supplier reference data can change in another session while this list stays open.
  useEffect(() => subscribeToLiveEvents(["suppliers"], () => {
    setLiveTick((current) => current + 1);
  }), []);

  useEffect(() => {
    let active = true;

    const loadSuppliers = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSuppliers();

        if (!active) {
          return;
        }

        const mapped = data.map(mapSupplier);
        setSuppliers(mapped);
        setSelectedSupplierId((current) => current || mapped[0]?.id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load suppliers.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSuppliers();

    return () => {
      active = false;
    };
  }, [liveTick]);

  const visibleSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      if (!normalizedQuery) {
        return true;
      }

      return [supplier.id, supplier.name, supplier.specialty, supplier.region].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [suppliers, query]);

  useEffect(() => {
    setSelectedSupplierId((current) => {
      if (visibleSuppliers.some((supplier) => supplier.id === current)) {
        return current;
      }

      return visibleSuppliers[0]?.id || "";
    });
  }, [visibleSuppliers]);

  const selectedSupplier = visibleSuppliers.find((supplier) => supplier.id === selectedSupplierId) ?? visibleSuppliers[0];
  const preferredCount = suppliers.filter((supplier) => supplier.reliability === "Preferred").length;

  return (
    <ModulePage>
      <section className="ops-board p-6 lg:p-7">
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="max-w-3xl">
            <div className="ops-kicker">Supplier network</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Supplier Ops</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#a3a893]">
              Track supply partners, sourcing specialization, and inbound reliability from the same operations shell used by purchasing.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatTile label="Supply partners" value={String(suppliers.length).padStart(2, "0")} helper="Connected to purchasing workflows" />
            <StatTile label="Preferred" value={String(preferredCount).padStart(2, "0")} helper="Primary sourcing relationships" />
            <StatTile label="Regions" value={String(new Set(suppliers.map((supplier) => supplier.region)).size).padStart(2, "0")} helper="Active vendor hubs" />
          </div>
        </div>
      </section>

      <section className="grid gap-7 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="ops-panel rounded-[32px] py-0">
          <CardHeader className="space-y-6 px-8 pt-8">
            <div>
              <CardTitle className="text-xl font-semibold text-white">Suppliers</CardTitle>
              <p className="mt-3 text-sm leading-7 text-[#969b88]">Search vendor IDs, sourcing specialties, and procurement regions.</p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by supplier ID, name, specialty, or region"
                className="h-12 rounded-full border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-[#656a58]"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-8 pb-8">
            {loading ? <div className="text-sm text-slate-400">Loading suppliers...</div> : null}
            {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

            {!loading &&
              !error &&
              visibleSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className="ops-queue-card w-full p-5 text-left"
                  data-active={selectedSupplier?.id === supplier.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold tracking-[-0.02em] text-white">{supplier.name}</div>
                      <div className="mt-1 text-sm text-[#8f947f]">{supplier.id} • {supplier.specialty}</div>
                    </div>
                    <ReliabilityBadge value={supplier.reliability} />
                  </div>
                  <div className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
                    <div>
                      <div className="text-[#6f745d]">Region</div>
                      <div className="mt-1 font-medium text-white">{supplier.region}</div>
                    </div>
                    <div>
                      <div className="text-[#6f745d]">Contact</div>
                      <div className="mt-1 font-medium text-white">{supplier.contact}</div>
                    </div>
                  </div>
                </button>
              ))}

            {!loading && !error && visibleSuppliers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-slate-400">
                No suppliers matched that search.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedSupplier ? (
          <Card className="ops-panel h-full rounded-[32px] py-0">
            <CardHeader className="px-8 pt-8">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-3xl font-semibold tracking-[-0.05em] text-white">{selectedSupplier.name}</CardTitle>
                  <ReliabilityBadge value={selectedSupplier.reliability} />
                </div>
                <p className="text-sm text-[#8d927e]">{selectedSupplier.id} • {selectedSupplier.specialty} • {selectedSupplier.region}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
              <div className="grid gap-5 md:grid-cols-3">
                <StatTile label="Supplier ID" value={selectedSupplier.id} helper="Primary reference for purchasing" compact />
                <StatTile label="Specialty" value={selectedSupplier.specialty} helper="Core sourcing capability" compact />
                <StatTile label="Region" value={selectedSupplier.region} helper="Current procurement geography" compact />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
                <div className="ops-telemetry rounded-[28px] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Supplier contact</h3>
                  <div className="mt-6 space-y-5 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <Factory className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Supplier name</div>
                        <div className="mt-1">{selectedSupplier.name}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Contact number</div>
                        <div className="mt-1">{selectedSupplier.contact}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 text-amber-200" />
                      <div>
                        <div className="font-medium text-white">Address</div>
                        <div className="mt-1">{selectedSupplier.address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ops-telemetry rounded-[28px] p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Procurement note</h3>
                  <p className="mt-5 text-sm leading-8 text-[#a0a591]">{selectedSupplier.notes}</p>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Inbound readiness</span>
                      <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-slate-200">Tracked</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Logistics alignment</span>
                      <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-slate-200">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <span className="text-sm text-[#909581]">Reliability</span>
                      <ReliabilityBadge value={selectedSupplier.reliability} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="ops-panel py-0">
            <CardContent className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-slate-400">
              {loading ? "Loading supplier details..." : "Select a supplier from the left panel to view its details."}
            </CardContent>
          </Card>
        )}
      </section>
    </ModulePage>
  );
}
