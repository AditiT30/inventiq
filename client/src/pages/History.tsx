import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Clock3, Filter, History as HistoryIcon, Search, ShieldAlert, Zap } from "lucide-react";

import { ModulePage } from "@/components/common/module-shell";
import { getHistory, subscribeToLiveEvents, type HistoryDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

type HistoryType = "All" | "Sales" | "Purchases" | "Manufacturing";
type RecordType = Exclude<HistoryType, "All">;

type HistoryRecord = {
  id: string;
  type: RecordType;
  reference: string;
  actor: string;
  status: string;
  amount: string;
  date: string;
  detail: string;
};

const typeClasses: Record<RecordType, string> = {
  Sales: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  Purchases: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  Manufacturing: "border-amber-300/20 bg-amber-300/10 text-amber-100",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapHistoryRecord(record: HistoryDto): HistoryRecord {
  return {
    ...record,
    date: formatDate(record.date),
  };
}

function TypeBadge({ type }: { type: RecordType }) {
  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${typeClasses[type]}`}>{type}</Badge>;
}

function History() {
  const [filter, setFilter] = useState<HistoryType>("All");
  const [query, setQuery] = useState("");
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveTick, setLiveTick] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftFilter, setDraftFilter] = useState<HistoryType>("All");
  const [draftQuery, setDraftQuery] = useState("");

  // History is read-only, so a light refetch on relevant live events keeps the audit view current.
  useEffect(() => subscribeToLiveEvents(["history"], () => {
    setLiveTick((current) => current + 1);
  }), []);

  useEffect(() => {
    if (filterModalOpen) {
      setDraftFilter(filter);
      setDraftQuery(query);
    }
  }, [filter, filterModalOpen, query]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");
        const type =
          filter === "All"
            ? "all"
            : filter === "Sales"
              ? "sales"
              : filter === "Purchases"
                ? "purchases"
                : "manufacturing";
        const data = await getHistory(type);

        if (!active) {
          return;
        }

        const mapped = data.map(mapHistoryRecord);
        setRecords(mapped);
        setSelectedRecordId((current) => current || mapped[0]?.id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load history records.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, [filter, liveTick]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [record.reference, record.actor, record.status, record.detail].some((field) =>
          field.toLowerCase().includes(normalizedQuery)
        );

      return matchesQuery;
    });
  }, [filter, query, records]);

  useEffect(() => {
    setSelectedRecordId((current) => {
      if (filteredRecords.some((record) => record.id === current)) {
        return current;
      }

      return filteredRecords[0]?.id || "";
    });
  }, [filteredRecords]);

  const selectedRecord = filteredRecords.find((record) => record.id === selectedRecordId) ?? filteredRecords[0];
  const visibleRecordItems = showAllRecords ? filteredRecords : filteredRecords.slice(0, 5);
  const hasMoreRecords = filteredRecords.length > 5;
  const salesCount = records.filter((record) => record.type === "Sales").length;
  const purchaseCount = records.filter((record) => record.type === "Purchases").length;
  const manufacturingCount = records.filter((record) => record.type === "Manufacturing").length;

  useEffect(() => {
    setShowAllRecords(false);
  }, [filter, query]);

  const exportHistory = () => {
    const rows = [
      ["Type", "Reference", "Actor", "Status", "Amount", "Date", "Detail"],
      ...filteredRecords.map((record) => [
        record.type,
        record.reference,
        record.actor,
        record.status,
        record.amount,
        record.date,
        record.detail,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `history-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportHistoryPdf = () => {
    const title = `Inventiq History Report - ${filter}`;
    const rows = filteredRecords
      .map(
        (record) => `
          <tr>
            <td>${escapeHtml(record.type)}</td>
            <td>${escapeHtml(record.reference)}</td>
            <td>${escapeHtml(record.actor)}</td>
            <td>${escapeHtml(record.status)}</td>
            <td>${escapeHtml(record.amount)}</td>
            <td>${escapeHtml(record.date)}</td>
            <td>${escapeHtml(record.detail)}</td>
          </tr>
        `
      )
      .join("");

    const reportHtml = `
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin-bottom: 8px; }
            p { margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; font-size: 12px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p>Generated on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Reference</th>
                <th>Actor</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const iframeWindow = iframe.contentWindow;
    const iframeDocument = iframe.contentDocument ?? iframeWindow?.document;

    if (!iframeWindow || !iframeDocument) {
      document.body.removeChild(iframe);
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 250);
    };

    iframeWindow.addEventListener("afterprint", cleanup, { once: true });

    iframeDocument.open();
    iframeDocument.write(reportHtml);
    iframeDocument.close();

    // Wait briefly so the print document is fully laid out before opening the browser print dialog.
    window.setTimeout(() => {
      iframeWindow.focus();
      iframeWindow.print();
      cleanup();
    }, 150);
  };

  return (
    <ModulePage>
      <section className="ops-board p-5 sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="ops-kicker">Audit telemetry</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">History Ops</h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => setFilterModalOpen(true)}
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                <Filter className="size-4" />
                Filters
              </Button>
              <Button
                type="button"
                onClick={exportHistoryPdf}
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                Export PDF
              </Button>
              <Button
                type="button"
                onClick={exportHistory}
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-white hover:bg-white/[0.06]"
              >
                Export log
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.02] px-6 py-16 text-center text-sm text-[#8f947f]">
              Loading history records...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-300/20 bg-rose-300/10 px-5 py-6 text-sm text-rose-100">{error}</div>
          ) : selectedRecord ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.54fr] xl:items-start">
                <section className="ops-panel self-start p-6 lg:p-7">
                  <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#7b806f]">
                        <span className="size-2 rounded-full bg-[#d6ff2e]" />
                        Active record
                      </div>
                      <div className="mt-5 text-[2.25rem] font-semibold tracking-[-0.06em] text-white">{selectedRecord.reference}</div>
                      <div className="mt-3">
                        <TypeBadge type={selectedRecord.type} />
                      </div>
                      <p className="mt-4 max-w-[26rem] text-sm leading-7 text-[#989d89]">
                        {selectedRecord.detail}
                      </p>

                      <div className="mt-8">
                        <div className="flex items-end justify-between gap-3">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-[#787d6d]">Timeline confidence</div>
                          <div className="text-3xl font-semibold tracking-[-0.05em] text-[#d6ff2e]">
                            {Math.min(99, 82 + filteredRecords.length)}%
                          </div>
                        </div>
                        <div className="ops-line mt-4">
                          <span style={{ width: `${Math.min(99, 82 + filteredRecords.length)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="ops-telemetry px-4 py-4">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7a7f6d]">
                            <Clock3 className="size-3.5 text-[#d6ff2e]" />
                            Logged date
                          </div>
                          <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{selectedRecord.date}</div>
                          <div className="mt-4 text-sm text-[#999f8a]">{selectedRecord.actor}</div>
                        </div>

                        <div className="ops-telemetry px-4 py-4">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7a7f6d]">
                            <ShieldAlert className="size-3.5 text-[#d6ff2e]" />
                            Record state
                          </div>
                          <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">{selectedRecord.status}</div>
                          <div className="mt-4 text-sm text-[#999f8a]">{selectedRecord.amount}</div>
                        </div>
                      </div>

                      <div className="ops-highlight flex items-center justify-between gap-4 px-5 py-5">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[#40440e]">Event signal</div>
                          <div className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
                            {selectedRecord.type}
                          </div>
                        </div>
                        <div className="flex size-14 items-center justify-center rounded-full border border-black/10 bg-black/5">
                          <Zap className="size-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="ops-panel p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">Event Queue</h2>
                    <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#949985]">
                      {filteredRecords.length} visible
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["All", "Sales", "Purchases", "Manufacturing"] as HistoryType[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFilter(option)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                          filter === option
                            ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                            : "border-white/10 bg-white/[0.03] text-[#8e9480]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#69705f]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search history by reference, actor, or status"
                      className="h-11 rounded-full border-white/10 bg-white/[0.025] pl-10 text-sm text-white placeholder:text-[#666b59]"
                    />
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#8f9482]">
                    <ArrowUpDown className="size-3.5" />
                    Newest first
                  </div>

                  <div className="mt-5 max-h-[30rem] space-y-3 overflow-y-auto pr-2">
                    {visibleRecordItems.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setSelectedRecordId(record.id)}
                        className="ops-queue-card w-full p-4 text-left"
                        data-active={selectedRecord.id === record.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6ff2e]">{record.reference}</div>
                          <TypeBadge type={record.type} />
                        </div>
                        <div className="mt-2 text-base font-semibold tracking-[-0.04em] text-white">{record.status}</div>
                        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#8d927f]">
                          <span>{record.actor}</span>
                          <span>{record.date}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {hasMoreRecords ? (
                    <div className="mt-5 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAllRecords((current) => !current)}
                        className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]"
                      >
                        {showAllRecords ? "Show less" : `View more (${filteredRecords.length - 5} more)`}
                      </Button>
                    </div>
                  ) : null}
                </aside>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.72fr_1.08fr]">
                <section className="ops-panel p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
                      <HistoryIcon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-3xl font-semibold tracking-[-0.05em] text-white">Event detail</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#d6ff2e]">{selectedRecord.type}</div>
                      </div>
                      <div className="mt-3 rounded-[22px] border border-white/6 bg-black/18 px-4 py-4 text-sm leading-7 text-[#c8cbbd]">
                        {selectedRecord.detail}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="ops-telemetry px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Reference</div>
                      <div className="mt-2 text-lg font-semibold text-white">{selectedRecord.reference}</div>
                    </div>
                    <div className="ops-telemetry px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Amount</div>
                      <div className="mt-2 text-lg font-semibold text-white">{selectedRecord.amount}</div>
                    </div>
                  </div>
                </section>

                <section className="ops-panel p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">Operational distribution</h2>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#d6ff2e]">audit aligned</div>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Sales</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{salesCount}</div>
                      <div className="ops-line mt-3"><span style={{ width: `${records.length ? (salesCount / records.length) * 100 : 0}%` }} /></div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Purchases</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{purchaseCount}</div>
                      <div className="ops-line mt-3"><span style={{ width: `${records.length ? (purchaseCount / records.length) * 100 : 0}%` }} /></div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d6d]">Manufacturing</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{manufacturingCount}</div>
                      <div className="ops-line mt-3"><span style={{ width: `${records.length ? (manufacturingCount / records.length) * 100 : 0}%` }} /></div>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 md:grid-cols-2">
                    {filteredRecords.slice(0, 4).map((record) => (
                      <div key={record.id} className="ops-telemetry px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{record.reference}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7b806f]">{record.actor}</div>
                          </div>
                          <div className="text-sm text-[#c1c7b0]">{record.date}</div>
                        </div>
                        <div className="mt-4 text-sm leading-7 text-[#a4aa95]">{record.status}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.02] px-6 py-16 text-center text-sm text-slate-400">
              No history records matched the current filters.
            </div>
          )}
        </div>
      </section>

      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              History filters
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              Apply a focused record type and search term from a dedicated filter modal.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {(["All", "Sales", "Purchases", "Manufacturing"] as HistoryType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDraftFilter(option)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                    draftFilter === option
                      ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                      : "border-white/10 bg-white/[0.03] text-[#8e9480] hover:bg-white/[0.06]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#69705f]" />
              <Input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search history by reference, actor, or status"
                className="h-11 rounded-full border-white/10 bg-white/[0.025] pl-10 text-sm text-white placeholder:text-[#666b59]"
              />
            </div>

            <DialogFooter className="mt-6 rounded-[24px] border-t border-white/8 bg-white/[0.02]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraftFilter("All");
                  setDraftQuery("");
                }}
                className="rounded-full text-[#b8bea4] hover:bg-white/[0.04] hover:text-white"
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setFilter(draftFilter);
                  setQuery(draftQuery);
                  setFilterModalOpen(false);
                }}
                className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]"
              >
                Apply filters
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

export default History;
