import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleArrowOutUpRight,
  CirclePlus,
  Cog,
  Edit3,
  Eye,
  Search,
  Thermometer,
  Trash2,
  Waves,
  Zap,
} from "lucide-react";

import { ModulePage } from "@/components/common/module-shell";
import { completeBatch, createBatch, deleteBatch, type BatchDto, getBatches, getProducts, subscribeToLiveEvents, type ProductDto, updateBatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BatchFormDialog, { toBatchPayload, type BatchFormValues } from "@/components/forms/BatchFormDialog";

type BatchStatus = "On Track" | "Needs Material" | "Delayed";
type SortKey = "batchId" | "line" | "eta" | "completion";

type Batch = {
  batchId: string;
  line: string;
  eta: string;
  etaSort: string;
  completion: string;
  completionValue: number;
  status: BatchStatus;
  rawStatus: string;
  supervisor: string;
  notes: string;
  rawMaterials: BatchDto["raw_materials"];
  outputMaterials: BatchDto["output"];
  endDate: string | null;
  materials: Array<{ item: string; required: number; issued: number; stage: string }>;
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function mapBatchStatus(batch: BatchDto): BatchStatus {
  if (batch.status.toLowerCase().includes("complete")) {
    return "On Track";
  }

  const hasShortMaterial = batch.raw_materials.some((material) => material.quantity > 50);
  if (hasShortMaterial) {
    return "Needs Material";
  }

  if (batch.end_date) {
    return "On Track";
  }

  return batch.raw_materials.length > 2 ? "Delayed" : "On Track";
}

function getMaterialStage(status: BatchStatus, required: number, issued: number) {
  if (issued >= required) {
    return "Issued";
  }

  if (status === "Needs Material") {
    return "Short";
  }

  if (issued > 0) {
    return "In use";
  }

  return "Pending issue";
}

function mapBatch(batch: BatchDto): Batch {
  const status = mapBatchStatus(batch);
  const requiredTotal = batch.raw_materials.reduce((sum, material) => sum + material.quantity, 0);
  const issuedTotal = batch.output.reduce((sum, material) => sum + material.quantity, 0);
  const completionValue =
    requiredTotal === 0 ? (batch.end_date ? 100 : 0) : Math.min(100, Math.round((issuedTotal / requiredTotal) * 100));

  return {
    batchId: batch.batch_number,
    line: batch.output.length > 1 ? "Assembly Cell" : "Packaging Line",
    eta: formatDateLabel(batch.end_date ?? batch.start_date),
    etaSort: batch.end_date ?? batch.start_date,
    completion: `${completionValue}%`,
    completionValue,
    status,
    rawStatus: batch.status,
    supervisor: "Production desk",
    notes: batch.end_date
      ? "Batch has completed and is ready for the next operations handoff."
      : "Batch is active. Review material allocation and output progress before moving it forward.",
    rawMaterials: batch.raw_materials,
    outputMaterials: batch.output,
    endDate: batch.end_date,
    materials: batch.raw_materials.map((material, index) => {
      const issued = batch.output[index]?.quantity ?? Math.max(0, material.quantity - Math.ceil(material.quantity * 0.3));

      return {
        item: material.product_code,
        required: material.quantity,
        issued,
        stage: getMaterialStage(status, material.quantity, issued),
      };
    }),
  };
}

function telemetryFromBatch(batch: Batch) {
  const requiredTotal = batch.materials.reduce((sum, material) => sum + material.required, 0);
  const issuedTotal = batch.materials.reduce((sum, material) => sum + material.issued, 0);
  const outputTotal = batch.outputMaterials.reduce((sum, material) => sum + material.quantity, 0);

  return {
    temperature: `${(42 + batch.completionValue / 18).toFixed(1)}°C`,
    vibration: `${(0.018 + batch.materials.length * 0.004).toFixed(3)}mm/s`,
    velocity: `${(outputTotal * 62).toLocaleString("en-IN")} units/hr`,
    resilience: `${Math.max(76, 100 - Math.max(0, requiredTotal - issuedTotal))}% resilient`,
  };
}

function Manufacturing() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("eta");
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchDialogMode, setBatchDialogMode] = useState<"create" | "edit">("create");
  const [batchDialogError, setBatchDialogError] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const loadBatches = async (isActive = true) => {
    try {
      setLoading(true);
      setError("");
      const data = await getBatches();

      if (!isActive) {
        return;
      }

      const mappedBatches = data.map(mapBatch);
      setBatches(mappedBatches);
      setSelectedBatchId((current) => {
        const nextSelected = current || mappedBatches[0]?.batchId || "";
        return mappedBatches.some((batch) => batch.batchId === nextSelected) ? nextSelected : mappedBatches[0]?.batchId || "";
      });
    } catch (loadError) {
      if (!isActive) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load manufacturing batches.");
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  };

  // Manufacturing needs both batch updates and product stock changes to stay accurate live.
  useEffect(() => {
    return subscribeToLiveEvents(["batches", "products"], () => {
      setLiveTick((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;
    void loadBatches(active);
    void (async () => {
      try {
        const data = await getProducts();
        if (active) {
          setProducts(data);
        }
      } catch {
        if (active) {
          setProducts([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [liveTick]);

  const handleEditBatch = async (batch: Batch) => {
    setSelectedBatchId(batch.batchId);
    setBatchDialogMode("edit");
    setBatchDialogError("");
    setBatchDialogOpen(true);
  };

  const handleAdvanceBatch = async (batch: Batch) => {
    try {
      if (batch.rawStatus.toLowerCase().includes("complete")) {
        return;
      }

      await completeBatch(batch.batchId);
      await loadBatches();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to complete batch.");
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    setDeleteError("");
    setBatchToDelete(batch);
  };

  const visibleBatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = batches.filter((batch) => {
      if (!normalizedQuery) {
        return true;
      }

      return [batch.batchId, batch.line, batch.status, batch.supervisor].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortKey === "completion") {
        return right.completionValue - left.completionValue;
      }

      if (sortKey === "eta") {
        return left.etaSort.localeCompare(right.etaSort);
      }

      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [batches, query, sortKey]);

  const selectedBatch = visibleBatches.find((batch) => batch.batchId === selectedBatchId) ?? visibleBatches[0];
  const visibleBatchItems = showAllBatches ? visibleBatches : visibleBatches.slice(0, 5);
  const hasMoreBatches = visibleBatches.length > 5;
  const telemetry = selectedBatch ? telemetryFromBatch(selectedBatch) : null;
  const requiredTotal = selectedBatch?.materials.reduce((sum, material) => sum + material.required, 0) ?? 0;
  const issuedTotal = selectedBatch?.materials.reduce((sum, material) => sum + material.issued, 0) ?? 0;
  const outputTotal = selectedBatch?.outputMaterials.reduce((sum, material) => sum + material.quantity, 0) ?? 0;
  const shortageCount = selectedBatch?.materials.filter((material) => material.stage === "Short").length ?? 0;
  const selectedBatchForDialog = batches.find((batch) => batch.batchId === selectedBatchId);

  useEffect(() => {
    setShowAllBatches(false);
  }, [query, sortKey]);

  const handleSubmitBatch = async (values: BatchFormValues) => {
    try {
      setBatchSubmitting(true);
      setBatchDialogError("");

      if (batchDialogMode === "create") {
        const createdBatch = await createBatch(toBatchPayload(values));
        setSelectedBatchId(createdBatch.batch_number);
      } else if (selectedBatchForDialog) {
        const updatedBatch = await updateBatch(selectedBatchForDialog.batchId, {
          status: values.status,
          raw_materials: values.raw_materials,
          output: values.output,
          end_date: selectedBatchForDialog.endDate,
        });
        setSelectedBatchId(updatedBatch.batch_number);
      }

      setBatchDialogOpen(false);
      await loadBatches();
    } catch (mutationError) {
      setBatchDialogError(mutationError instanceof Error ? mutationError.message : "Unable to save batch.");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) {
      return;
    }

    try {
      setDeleteSubmitting(true);
      setDeleteError("");
      await deleteBatch(batchToDelete.batchId);

      setBatches((currentBatches) => {
        const remainingBatches = currentBatches.filter((batch) => batch.batchId !== batchToDelete.batchId);
        const nextSelectedBatch = remainingBatches[0];
        setSelectedBatchId((currentSelected) =>
          currentSelected === batchToDelete.batchId ? nextSelectedBatch?.batchId ?? "" : currentSelected
        );
        return remainingBatches;
      });

      setBatchToDelete(null);
      await loadBatches();
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to delete batch.";
      setDeleteError(message);
      setError(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const exportBatchLog = () => {
    const rows = [
      ["Batch", "Line", "ETA", "Completion", "Status", "Supervisor", "Materials", "Output units"],
      ...visibleBatches.map((batch) => [
        batch.batchId,
        batch.line,
        batch.eta,
        batch.completion,
        batch.status,
        batch.supervisor,
        batch.materials.map((material) => `${material.item} ${material.issued}/${material.required}`).join(" | "),
        String(batch.outputMaterials.reduce((sum, material) => sum + material.quantity, 0)),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manufacturing-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ModulePage>
      <section className="ops-board p-5 sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="ops-kicker">Live telemetry</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Manufacturing Ops</h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  setBatchDialogMode("create");
                  setBatchDialogError("");
                  setBatchDialogOpen(true);
                }}
                className="neon-pill rounded-full px-6 text-sm font-semibold hover:opacity-95"
              >
                <CirclePlus className="size-4" />
                Add batch
              </Button>
              <Button
                type="button"
                onClick={exportBatchLog}
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                Export log
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.02] px-6 py-16 text-center text-sm text-[#8f947f]">
              Loading manufacturing batches...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-300/20 bg-rose-300/10 px-5 py-6 text-sm text-rose-100">{error}</div>
          ) : selectedBatch ? (
            <>
              <section className="ops-panel p-6 lg:p-7">
                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#7b806f]">
                      <span className="size-2 rounded-full bg-[#d6ff2e]" />
                      Active node
                    </div>
                    <div className="mt-5 text-[2.35rem] font-semibold uppercase italic tracking-[-0.06em] text-white">
                      {selectedBatch.line}
                    </div>
                    <p className="mt-4 max-w-[24rem] text-sm leading-7 text-[#989d89]">
                      {selectedBatch.notes}
                    </p>

                    <div className="mt-8">
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-[#787d6d]">Efficiency (OEE)</div>
                        <div className="text-3xl font-semibold tracking-[-0.05em] text-[#d6ff2e]">{selectedBatch.completion}</div>
                      </div>
                      <div className="ops-line mt-4">
                        <span style={{ width: selectedBatch.completion }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="ops-telemetry px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7a7f6d]">
                          <Thermometer className="size-3.5 text-[#d6ff2e]" />
                          Temperature
                        </div>
                        <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{telemetry?.temperature}</div>
                        <div className="telemetry-bars mt-5 h-14">
                          <span style={{ height: "26%" }} />
                          <span style={{ height: "38%" }} />
                          <span style={{ height: "64%" }} />
                          <span style={{ height: "48%" }} />
                          <span style={{ height: "72%" }} />
                        </div>
                      </div>

                      <div className="ops-telemetry px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7a7f6d]">
                          <Waves className="size-3.5 text-[#d6ff2e]" />
                          Vibration
                        </div>
                        <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{telemetry?.vibration}</div>
                        <div className="telemetry-bars mt-5 h-14">
                          <span style={{ height: "14%" }} />
                          <span style={{ height: "29%" }} />
                          <span style={{ height: "24%" }} />
                          <span style={{ height: "18%" }} />
                          <span style={{ height: "27%" }} />
                        </div>
                      </div>
                    </div>

                    <div className="ops-highlight flex items-center justify-between gap-4 px-5 py-5">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#40440e]">Output velocity</div>
                        <div className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{telemetry?.velocity}</div>
                      </div>
                      <div className="flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/5">
                        <Zap className="size-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[0.56fr_0.44fr] xl:items-start">
                <aside className="ops-panel p-5 self-start">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">Work Order Queue</h2>
                    </div>
                    <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#949985]">
                      {visibleBatches.length} active
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { key: "batchId", label: "Batch" },
                      { key: "line", label: "Line" },
                      { key: "eta", label: "ETA" },
                      { key: "completion", label: "Progress" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSortKey(option.key as SortKey)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                          sortKey === option.key
                            ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                            : "border-white/10 bg-white/[0.03] text-[#8e9480]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#69705f]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search batches, lines, or supervisors"
                      className="h-11 rounded-full border-white/10 bg-white/[0.025] pl-10 text-sm text-white placeholder:text-[#666b59]"
                    />
                  </div>

                  <div className="mt-5 max-h-[30rem] space-y-3 overflow-y-auto pr-2">
                    {visibleBatchItems.map((batch) => (
                      <button
                        key={batch.batchId}
                        type="button"
                        onClick={() => setSelectedBatchId(batch.batchId)}
                        className="ops-queue-card w-full p-4 text-left"
                        data-active={selectedBatch.batchId === batch.batchId}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6ff2e]">#{batch.batchId}</div>
                        <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{batch.line}</div>
                        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#8d927f]">
                          <span>{batch.status}</span>
                          <span>Due {batch.eta}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {hasMoreBatches ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAllBatches((current) => !current)}
                      className="mt-5 w-full rounded-full border-white/10 bg-white/[0.03] text-sm font-semibold text-white hover:bg-white/[0.06]"
                    >
                      {showAllBatches ? "Show less" : `View more (${visibleBatches.length - 5} more)`}
                    </Button>
                  ) : null}
                </aside>

                <div className="space-y-6 self-start">
                  <section className="ops-panel border-rose-400/25 p-5">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200">
                        <AlertTriangle className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-3xl font-semibold tracking-[-0.05em] text-white">Line alert</div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-rose-200">
                            {selectedBatch.status === "Delayed" ? "Maintenance required" : "Monitoring"}
                          </div>
                        </div>
                        <div className="mt-3 rounded-[22px] border border-white/6 bg-black/18 px-4 py-4 text-sm leading-7 text-[#c8cbbd]">
                          {selectedBatch.status === "Delayed"
                            ? `Hydraulic pressure anomaly detected around ${selectedBatch.line}. Supervisor attention recommended before advancing ${selectedBatch.batchId}.`
                            : selectedBatch.status === "Needs Material"
                              ? `${selectedBatch.batchId} is waiting on additional materials before full throughput can resume.`
                              : `No blocking alerts on ${selectedBatch.batchId}. Continue monitoring output and handoff readiness.`}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => handleAdvanceBatch(selectedBatch)} className="rounded-full bg-[#d85b2d] px-5 text-sm font-semibold text-white hover:bg-[#c95126]">
                        <CircleArrowOutUpRight className="size-4" />
                        Dispatch team
                      </Button>
                      <Button onClick={() => setDetailModalOpen(true)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
                        <Eye className="size-4" />
                        View details
                      </Button>
                      <Button onClick={() => handleEditBatch(selectedBatch)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
                        <Edit3 className="size-4" />
                        Diagnostics
                      </Button>
                      <Button onClick={() => handleDeleteBatch(selectedBatch)} variant="ghost" className="rounded-full text-rose-200 hover:bg-rose-300/10 hover:text-rose-100">
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </section>

                  <section className="ops-panel p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">Supply Chain Health</h2>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#d6ff2e]">{telemetry?.resilience}</div>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Raw materials</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{requiredTotal.toLocaleString("en-IN")} kg</div>
                        <div className="ops-line mt-3"><span style={{ width: `${Math.min(100, Math.max(20, issuedTotal))}%` }} /></div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Output units</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{outputTotal.toLocaleString("en-IN")} units</div>
                        <div className="ops-line mt-3"><span style={{ width: `${Math.min(100, outputTotal * 12)}%` }} /></div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Shortages</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{shortageCount}</div>
                        <div className="ops-line mt-3"><span style={{ width: `${Math.min(100, shortageCount * 35)}%` }} /></div>
                      </div>
                    </div>

                    <div className="mt-7 grid gap-3 md:grid-cols-2">
                      {selectedBatch.materials.map((material) => {
                        const issuedWidth = material.required === 0 ? 0 : (material.issued / material.required) * 100;

                        return (
                          <div key={`${selectedBatch.batchId}-${material.item}`} className="ops-telemetry px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{material.item}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7b806f]">{material.stage}</div>
                              </div>
                              <div className="text-sm text-[#c1c7b0]">
                                {material.issued}/{material.required}
                              </div>
                            </div>
                            <div className="ops-line mt-4">
                              <span style={{ width: `${Math.min(100, issuedWidth)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-7 rounded-[24px] border border-white/6 bg-black/15 px-5 py-5 text-sm leading-8 text-[#a6ab97]">
                      <h3 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.03em] text-white">
                        <Cog className="size-4 text-[#d6ff2e]" />
                        Production note
                      </h3>
                      <p className="mt-3">{selectedBatch.notes}</p>
                    </div>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.02] px-6 py-16 text-center text-sm text-slate-400">
              No batches matched that search.
            </div>
          )}
        </div>
      </section>

      <BatchFormDialog
        open={batchDialogOpen}
        mode={batchDialogMode}
        defaultValues={
          batchDialogMode === "edit" && selectedBatchForDialog
            ? {
                batch_number: selectedBatchForDialog.batchId,
                status: selectedBatchForDialog.rawStatus,
                raw_materials: selectedBatchForDialog.rawMaterials,
                output: selectedBatchForDialog.outputMaterials,
              }
            : undefined
        }
        submitting={batchSubmitting}
        error={batchDialogError}
        products={products}
        onOpenChange={setBatchDialogOpen}
        onSubmit={handleSubmitBatch}
      />

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {selectedBatch ? `${selectedBatch.batchId} detail view` : "Batch detail"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              Modal detail view for active manufacturing telemetry, material allocation, and output progress.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch ? (
            <div className="min-h-0 overflow-y-auto px-6 pb-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="ops-telemetry px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Batch</div>
                  <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{selectedBatch.batchId}</div>
                  <div className="mt-3 text-sm leading-7 text-[#989d89]">{selectedBatch.line}</div>
                </div>
                <div className="ops-telemetry px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Completion</div>
                  <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{selectedBatch.completion}</div>
                  <div className="mt-3 text-sm leading-7 text-[#989d89]">Supervisor: {selectedBatch.supervisor}</div>
                </div>
                <div className="ops-telemetry px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">ETA</div>
                  <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{selectedBatch.eta}</div>
                  <div className="mt-3 text-sm leading-7 text-[#989d89]">Output velocity {telemetry?.velocity}</div>
                </div>
                <div className="ops-telemetry px-5 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Status</div>
                  <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{selectedBatch.status}</div>
                  <div className="mt-3 text-sm leading-7 text-[#989d89]">Resilience {telemetry?.resilience}</div>
                </div>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-2">
                {selectedBatch.materials.map((material) => (
                  <div key={`${selectedBatch.batchId}-modal-${material.item}`} className="ops-telemetry px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{material.item}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7b806f]">{material.stage}</div>
                      </div>
                      <div className="text-sm text-[#c1c7b0]">
                        {material.issued}/{material.required}
                      </div>
                    </div>
                    <div className="ops-line mt-4">
                      <span style={{ width: `${material.required === 0 ? 0 : Math.min(100, (material.issued / material.required) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(batchToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setBatchToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Remove batch
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              {batchToDelete
                ? `Delete manufacturing batch ${batchToDelete.batchId}. This cannot be undone.`
                : "Delete this manufacturing batch."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {deleteError ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {deleteError}
              </div>
            ) : null}

            <DialogFooter className="mt-6 rounded-[24px] border-t border-white/8 bg-white/[0.02]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBatchToDelete(null);
                  setDeleteError("");
                }}
                className="rounded-full text-[#b8bea4] hover:bg-white/[0.04] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmDeleteBatch()}
                disabled={deleteSubmitting}
                className="rounded-full bg-rose-400 px-6 text-sm font-semibold text-[#1b140f] hover:bg-rose-300"
              >
                {deleteSubmitting ? "Removing..." : "Delete batch"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

export default Manufacturing;
