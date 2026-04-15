import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, CircleArrowOutUpRight, CirclePlus, Edit3, Eye, Search, Trash2 } from "lucide-react";

import { ModulePage, PanelShell, SplitLayout } from "@/components/common/module-shell";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createOrder, deleteOrder, formatCurrency, getOrdersByType, getProducts, getSuppliers, subscribeToLiveEvents, updateOrder, updateOrderStatus, type OrderDto, type ProductDto, type SupplierDto } from "@/lib/api";
import OrderFormDialog, { toOrderPayload, type OrderFormValues } from "@/components/forms/OrderFormDialog";

type PurchaseStatus = "Quotations Received" | "Unpaid" | "Paid" | "Order Completion" | "History";
type SortKey = "poId" | "supplier" | "arrival" | "value";
type PurchaseView = "All" | "Quotations" | "Unpaid" | "Paid" | "Completion" | "History";

type PurchaseOrder = {
  poId: string;
  supplier: string;
  arrival: string;
  value: number;
  valueLabel: string;
  status: PurchaseStatus;
  rawStatus: string;
  buyer: string;
  paymentTerms: string;
  notes: string;
  supplierId: string | null;
  linesRaw: OrderDto["products"];
  lines: Array<{ item: string; qty: number; cost: string; stage: string }>;
};

const purchaseStatusClasses: Record<PurchaseStatus, string> = {
  "Quotations Received": "border-sky-300/20 bg-sky-300/10 text-sky-100",
  Unpaid: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  Paid: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  "Order Completion": "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  History: "border-white/15 bg-white/[0.04] text-white",
};

const purchaseViewOptions: Array<{ key: PurchaseView; label: string }> = [
  { key: "All", label: "All" },
  { key: "Quotations", label: "Quotations" },
  { key: "Unpaid", label: "Unpaid" },
  { key: "Paid", label: "Paid" },
  { key: "Completion", label: "Completion" },
  { key: "History", label: "History" },
];

function mapPurchaseStatus(status: string): PurchaseStatus {
  if (status === "Quotations Received" || status === "Unpaid" || status === "Paid" || status === "Order Completion" || status === "History") {
    return status;
  }
  return "Quotations Received";
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getLineStage(status: PurchaseStatus) {
  if (status === "Order Completion") {
    return "Dock scheduled";
  }

  if (status === "Paid") {
    return "Payment cleared";
  }

  if (status === "History") {
    return "Archived";
  }

  return "Quotation / hold";
}

function mapPurchaseOrder(order: OrderDto): PurchaseOrder {
  const value = order.products.reduce((sum, line) => sum + line.quantity * (line.unit_price ?? 0), 0);
  const status = mapPurchaseStatus(order.status);

  return {
    poId: order.order_id,
    supplier: order.supplier?.name ?? order.supplier_id ?? "Supplier account",
    arrival: formatDateLabel(order.date),
    value,
    valueLabel: formatCurrency(value),
    status,
    rawStatus: order.status,
    buyer: "Procurement desk",
    paymentTerms: order.status === "Paid" ? "Paid" : order.status === "Unpaid" ? "Unpaid" : "Quotation pending",
    notes: order.notes ?? "No receiving note added yet.",
    supplierId: order.supplier_id,
    linesRaw: order.products,
    lines: order.products.map((line) => ({
      item: line.product_code,
      qty: line.quantity,
      cost: formatCurrency(line.quantity * (line.unit_price ?? 0)),
      stage: getLineStage(status),
    })),
  };
}

function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${purchaseStatusClasses[status]}`}>{status}</Badge>;
}

function InfoTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-white/0 bg-white/[0.028] px-5 py-5 backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">{label}</div>
      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-3 text-sm leading-7 text-[#989d89]">{helper}</div>
    </div>
  );
}

function PurchaseOrders() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("arrival");
  const [purchaseView, setPurchaseView] = useState<PurchaseView>("All");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogMode, setOrderDialogMode] = useState<"create" | "edit">("create");
  const [orderDialogError, setOrderDialogError] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const loadOrders = async (isActive = true) => {
    try {
      setLoading(true);
      setError("");
      const purchases = await getOrdersByType("purchase");

      if (!isActive) {
        return;
      }

      const mappedOrders = purchases.map(mapPurchaseOrder);
      setOrders(mappedOrders);
      setSelectedPoId((current) => {
        const nextSelected = current || mappedOrders[0]?.poId || "";
        return mappedOrders.some((order) => order.poId === nextSelected) ? nextSelected : mappedOrders[0]?.poId || "";
      });
    } catch (loadError) {
      if (!isActive) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load purchase orders.");
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  };

  // Purchase views depend on order, supplier, and product changes from other active sessions.
  useEffect(() => {
    return subscribeToLiveEvents(["orders", "suppliers", "products"], () => {
      setLiveTick((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;
    void loadOrders(active);
    void (async () => {
      try {
        const data = await getSuppliers();
        if (active) {
          setSuppliers(data);
        }
      } catch {
        if (active) {
          setSuppliers([]);
        }
      }
    })();
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

  const handleEditOrder = async (order: PurchaseOrder) => {
    setSelectedPoId(order.poId);
    setOrderDialogMode("edit");
    setOrderDialogError("");
    setOrderDialogOpen(true);
  };

  const handleAdvanceOrder = async (order: PurchaseOrder) => {
    const nextStatus =
      order.rawStatus === "Quotations Received"
        ? "Unpaid"
        : order.rawStatus === "Unpaid"
          ? "Paid"
          : order.rawStatus === "Paid"
            ? "Order Completion"
            : order.rawStatus === "Order Completion"
              ? "History"
              : "History";

    try {
      await updateOrderStatus(order.poId, nextStatus);
      await loadOrders();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to move purchase order to receiving.");
    }
  };

  const handleDeleteOrder = async (order: PurchaseOrder) => {
    setDeleteError("");
    setOrderToDelete(order);
  };

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchesView =
        purchaseView === "All"
          ? true
          : purchaseView === "Quotations"
            ? order.status === "Quotations Received"
            : purchaseView === "Completion"
              ? order.status === "Order Completion"
              : order.status === purchaseView;

      if (!matchesView) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [order.poId, order.supplier, order.buyer, order.status].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortKey === "value") {
        return right.value - left.value;
      }

      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [orders, purchaseView, query, sortKey]);

  const selectedOrder = visibleOrders.find((order) => order.poId === selectedPoId) ?? visibleOrders[0];
  const selectedOrderForDialog = orders.find((order) => order.poId === selectedPoId);
  const visibleOrderItems = showAllOrders ? visibleOrders : visibleOrders.slice(0, 5);
  const hasMoreOrders = visibleOrders.length > 5;

  useEffect(() => {
    setShowAllOrders(false);
  }, [purchaseView, query, sortKey]);

  const handleSubmitOrder = async (values: OrderFormValues) => {
    try {
      setOrderSubmitting(true);
      setOrderDialogError("");

      if (orderDialogMode === "create") {
        const createdOrder = await createOrder(toOrderPayload("purchase", values));
        setSelectedPoId(createdOrder.order_id);
      } else if (selectedOrderForDialog) {
        const updatedOrder = await updateOrder(selectedOrderForDialog.poId, toOrderPayload("purchase", values));
        setSelectedPoId(updatedOrder.order_id);
      }

      setOrderDialogOpen(false);
      await loadOrders();
    } catch (mutationError) {
      setOrderDialogError(mutationError instanceof Error ? mutationError.message : "Unable to save purchase order.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) {
      return;
    }

    try {
      setDeleteSubmitting(true);
      setDeleteError("");
      await deleteOrder(orderToDelete.poId);

      setOrders((currentOrders) => {
        const remainingOrders = currentOrders.filter((order) => order.poId !== orderToDelete.poId);
        const nextSelectedOrder = remainingOrders[0];
        setSelectedPoId((currentSelected) =>
          currentSelected === orderToDelete.poId ? nextSelectedOrder?.poId ?? "" : currentSelected
        );
        return remainingOrders;
      });

      setOrderToDelete(null);
      await loadOrders();
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to delete purchase order.";
      setDeleteError(message);
      setError(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <ModulePage>
      <section className="ops-board p-6 lg:p-7">
        <div className="flex flex-col gap-8">
          <div className="max-w-3xl">
            <div className="ops-kicker">Inbound telemetry</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Purchase Ops</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#a3a893]">
              Track delivery timing, supplier detail, and receiving context through the same control-room layout as history.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Open POs" value={String(orders.length).padStart(2, "0")} helper="Awaiting arrival or receipt" />
            <InfoTile label="Quotations" value={String(orders.filter((order) => order.status === "Quotations Received").length).padStart(2, "0")} helper="Awaiting commercial conversion" />
            <InfoTile label="Paid" value={String(orders.filter((order) => order.status === "Paid").length).padStart(2, "0")} helper="Commercially cleared orders" />
            <InfoTile label="Completion" value={String(orders.filter((order) => order.status === "Order Completion").length).padStart(2, "0")} helper="Ready for inventory addition" />
          </div>

          <div className="flex justify-start">
            <Button
              type="button"
              onClick={() => {
                setOrderDialogMode("create");
                setOrderDialogError("");
                setOrderDialogOpen(true);
              }}
              className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]"
            >
              <CirclePlus className="size-4" />
              Add purchase order
            </Button>
          </div>
        </div>
      </section>

      <SplitLayout
        ratio="detail"
        left={
          <PanelShell
            title="Purchase orders"
            description="Surface quotation-stage purchasing separately from payment and receiving stages."
            className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
          >
            <div className="relative mb-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search purchase orders, suppliers, or buyers"
                className="h-12 rounded-full border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-[#656a58]"
              />
            </div>
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {purchaseViewOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPurchaseView(option.key)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                      purchaseView === option.key
                        ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                        : "border-white/10 bg-white/[0.03] text-[#8e9480] hover:bg-white/[0.06]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "poId", label: "PO" },
                  { key: "supplier", label: "Supplier" },
                  { key: "arrival", label: "Arrival" },
                  { key: "value", label: "Value" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSortKey(option.key as SortKey)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] ${
                      sortKey === option.key
                        ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                        : "border-white/10 bg-white/[0.03] text-[#979c88] hover:bg-white/[0.06]"
                    }`}
                  >
                    <ArrowUpDown className="size-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="py-16 text-center text-sm text-[#8f947f]">Loading purchase orders...</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-6 text-sm text-rose-100">{error}</div>
            ) : (
              <>
                <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
                  {visibleOrderItems.map((order) => (
                    <button
                      key={order.poId}
                      type="button"
                      onClick={() => setSelectedPoId(order.poId)}
                      className="w-full rounded-[24px] border border-white/0 bg-white/[0.028] p-5 text-left backdrop-blur-xl transition hover:bg-white/[0.045]"
                      data-active={selectedOrder?.poId === order.poId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold tracking-[-0.02em] text-white">{order.poId}</div>
                          <div className="mt-1 text-sm text-[#8f947f]">{order.supplier}</div>
                        </div>
                        <PurchaseStatusBadge status={order.status} />
                      </div>
                      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <div className="text-[#6f745d]">Arrival</div>
                          <div className="mt-1 font-medium text-white">{order.arrival}</div>
                        </div>
                        <div>
                          <div className="text-[#6f745d]">Value</div>
                          <div className="mt-1 font-medium text-white">{order.valueLabel}</div>
                        </div>
                        <div>
                          <div className="text-[#6f745d]">Buyer</div>
                          <div className="mt-1 font-medium text-white">{order.buyer}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {hasMoreOrders ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAllOrders((current) => !current)}
                      className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-medium text-white hover:bg-white/[0.06]"
                    >
                      {showAllOrders ? "Show less" : `See more (${visibleOrders.length - 5} more)`}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </PanelShell>
        }
        right={
          <div className="self-start">
            {selectedOrder ? (
              <PanelShell
                title={`${selectedOrder.poId} details`}
                description="Inspect inbound lines, supplier timing, and the next receiving action."
                className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
                actions={
                  <>
                    <Button onClick={() => setDetailModalOpen(true)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
                      <Eye className="size-4" />
                      View details
                    </Button>
                    <Button onClick={() => handleEditOrder(selectedOrder)} className="rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-200">
                      <Edit3 className="size-4" />
                      Edit
                    </Button>
                    <Button onClick={() => handleAdvanceOrder(selectedOrder)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
                      <CircleArrowOutUpRight className="size-4" />
                      Move to next stage
                    </Button>
                    <Button onClick={() => handleDeleteOrder(selectedOrder)} variant="ghost" className="rounded-full text-rose-200 hover:bg-rose-300/10 hover:text-rose-100">
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </>
                }
              >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="Supplier" value={selectedOrder.supplier} helper={`Buyer: ${selectedOrder.buyer}`} />
                  <InfoTile label="Order value" value={selectedOrder.valueLabel} helper={`Terms: ${selectedOrder.paymentTerms}`} />
                  <InfoTile label="Arrival date" value={selectedOrder.arrival} helper="Receiving coordination ready" />
                  <div className="rounded-[24px] border border-white/0 bg-white/[0.028] p-5 backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Status</div>
                    <div className="mt-3">
                      <PurchaseStatusBadge status={selectedOrder.status} />
                    </div>
                  </div>
                </div>

                <div className="mt-7 rounded-[28px] border border-white/0 bg-white/[0.028] p-5 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Inbound line items</h3>
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/8">
                          <TableHead className="text-slate-400">Item</TableHead>
                          <TableHead className="text-slate-400">Qty</TableHead>
                          <TableHead className="text-slate-400">Value</TableHead>
                          <TableHead className="text-slate-400">Stage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.lines.map((line) => (
                          <TableRow key={`${selectedOrder.poId}-${line.item}`} className="border-white/8">
                            <TableCell className="text-white">{line.item}</TableCell>
                            <TableCell className="text-slate-300">{line.qty}</TableCell>
                            <TableCell className="text-slate-300">{line.cost}</TableCell>
                            <TableCell className="text-slate-300">{line.stage}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mt-7 rounded-[28px] border border-white/0 bg-white/[0.028] p-6 text-sm leading-8 text-[#a0a591] backdrop-blur-xl">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Receiving note</h3>
                  <p className="mt-3">{selectedOrder.notes}</p>
                </div>
              </PanelShell>
            ) : (
              <PanelShell
                title="Purchase detail"
                description="Select a purchase order from the left to inspect its details."
                className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
              >
                <div className="py-16 text-center text-sm text-slate-400">
                  {loading ? "Loading purchase orders..." : error ? "Purchase orders are unavailable right now." : "No purchase orders matched that search."}
                </div>
              </PanelShell>
            )}
          </div>
        }
      />

      <OrderFormDialog
        open={orderDialogOpen}
        mode={orderDialogMode}
        orderType="purchase"
        title={orderDialogMode === "create" ? "Create purchase order" : "Edit purchase order"}
        description="Manage supplier, receiving note, and line items with a validated purchase form."
        suppliers={suppliers}
        products={products}
        defaultValues={
          orderDialogMode === "edit" && selectedOrderForDialog
            ? {
                status: selectedOrderForDialog.rawStatus,
                notes: selectedOrderForDialog.notes,
                supplier_id: selectedOrderForDialog.supplierId ?? "",
                products: selectedOrderForDialog.linesRaw.map((item) => ({
                  product_code: item.product_code,
                  quantity: item.quantity,
                  unit_price: item.unit_price ?? 0,
                })),
              }
            : undefined
        }
        submitting={orderSubmitting}
        error={orderDialogError}
        onOpenChange={setOrderDialogOpen}
        onSubmit={handleSubmitOrder}
      />

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {selectedOrder ? `${selectedOrder.poId} detail view` : "Purchase order detail"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              Modal detail view for quotation review, payment state, and receiving readiness.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="min-h-0 overflow-y-auto px-6 pb-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="Supplier" value={selectedOrder.supplier} helper={`Buyer: ${selectedOrder.buyer}`} />
                <InfoTile label="Order value" value={selectedOrder.valueLabel} helper={`Terms: ${selectedOrder.paymentTerms}`} />
                <InfoTile label="Arrival date" value={selectedOrder.arrival} helper="Receiving coordination ready" />
                <div className="ops-telemetry p-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Status</div>
                  <div className="mt-3">
                    <PurchaseStatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>

              <div className="ops-telemetry mt-7 rounded-[28px] p-5">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Inbound line items</h3>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/8">
                        <TableHead className="text-slate-400">Item</TableHead>
                        <TableHead className="text-slate-400">Qty</TableHead>
                        <TableHead className="text-slate-400">Value</TableHead>
                        <TableHead className="text-slate-400">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.lines.map((line) => (
                        <TableRow key={`${selectedOrder.poId}-modal-${line.item}`} className="border-white/8">
                          <TableCell className="text-white">{line.item}</TableCell>
                          <TableCell className="text-slate-300">{line.qty}</TableCell>
                          <TableCell className="text-slate-300">{line.cost}</TableCell>
                          <TableCell className="text-slate-300">{line.stage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setOrderToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Remove purchase order
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              {orderToDelete
                ? `Delete purchase order ${orderToDelete.poId} for ${orderToDelete.supplier}. This cannot be undone.`
                : "Delete this purchase order."}
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
                  setOrderToDelete(null);
                  setDeleteError("");
                }}
                className="rounded-full text-[#b8bea4] hover:bg-white/[0.04] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmDeleteOrder()}
                disabled={deleteSubmitting}
                className="rounded-full bg-rose-400 px-6 text-sm font-semibold text-[#1b140f] hover:bg-rose-300"
              >
                {deleteSubmitting ? "Removing..." : "Delete order"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

export default PurchaseOrders;
