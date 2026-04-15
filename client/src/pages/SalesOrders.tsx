import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, CircleArrowOutUpRight, CirclePlus, Edit3, Eye, Search, Trash2 } from "lucide-react";

import { ModulePage, PanelShell, SplitLayout } from "@/components/common/module-shell";
import { createOrder, deleteOrder, formatCurrency, getCustomers, getOrdersByType, getProducts, subscribeToLiveEvents, updateOrder, updateOrderStatus, type CustomerDto, type OrderDto, type ProductDto } from "@/lib/api";
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
import OrderFormDialog, { toOrderPayload, type OrderFormValues } from "@/components/forms/OrderFormDialog";

type SalesStatus = "Quotation" | "Packing" | "Dispatch" | "History";
type SortKey = "orderId" | "customer" | "total" | "updated";
type SalesView = "All" | "Quotations" | "Packing" | "Dispatch" | "History";

type SalesOrder = {
  orderId: string;
  customer: string;
  total: number;
  totalLabel: string;
  status: SalesStatus;
  rawStatus: string;
  updated: string;
  salesRep: string;
  shipBy: string;
  payment: string;
  notes: string;
  customerId: string | null;
  itemsRaw: OrderDto["products"];
  items: Array<{ name: string; qty: number; price: string; status: string }>;
};

const statusClasses: Record<SalesStatus, string> = {
  Dispatch: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  Packing: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  Quotation: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  History: "border-white/15 bg-white/[0.04] text-white",
};

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "orderId", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "total", label: "Total" },
  { key: "updated", label: "Updated" },
];

const salesViewOptions: Array<{ key: SalesView; label: string }> = [
  { key: "All", label: "All" },
  { key: "Quotations", label: "Quotations" },
  { key: "Packing", label: "Packing" },
  { key: "Dispatch", label: "Dispatch" },
  { key: "History", label: "History" },
];

function mapSalesStatus(status: string): SalesStatus {
  if (status === "Quotation" || status === "Packing" || status === "Dispatch" || status === "History") {
    return status;
  }
  return "Quotation";
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatUpdatedLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLineStatus(orderStatus: SalesStatus) {
  if (orderStatus === "Dispatch") {
    return "Packed";
  }

  if (orderStatus === "Packing") {
    return "Packing";
  }

  if (orderStatus === "History") {
    return "Archived";
  }

  return "Quoted";
}

function mapSalesOrder(order: OrderDto): SalesOrder {
  const total = order.products.reduce((sum, line) => sum + line.quantity * (line.unit_price ?? 0), 0);
  const status = mapSalesStatus(order.status);

  return {
    orderId: order.order_id,
    customer: order.customer?.name ?? order.customer_id ?? "Customer account",
    total,
    totalLabel: formatCurrency(total),
    status,
    rawStatus: order.status,
    updated: formatUpdatedLabel(order.date),
    salesRep: "Ops Desk",
    shipBy: formatDateLabel(order.date),
    payment: status === "History" || status === "Dispatch" ? "Paid" : "Pending",
    notes: order.notes ?? "No operational note added yet.",
    customerId: order.customer_id,
    itemsRaw: order.products,
    items: order.products.map((line) => ({
      name: line.product_code,
      qty: line.quantity,
      price: formatCurrency(line.quantity * (line.unit_price ?? 0)),
      status: getLineStatus(status),
    })),
  };
}

function StatusBadge({ status }: { status: SalesStatus }) {
  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[status]}`}>{status}</Badge>;
}

function SortButtons({
  activeKey,
  onChange,
}: {
  activeKey: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {sortOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] ${
            activeKey === option.key
              ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
              : "border-white/10 bg-white/[0.03] text-[#979c88] hover:bg-white/[0.06]"
          }`}
        >
          <ArrowUpDown className="size-3.5" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function InfoCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-white/0 bg-white/[0.028] px-5 py-5 backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">{label}</div>
      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-3 text-sm leading-7 text-[#989d89]">{helper}</div>
    </div>
  );
}

function SalesListItem({
  order,
  selected,
  onSelect,
}: {
  order: SalesOrder;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-[24px] border border-white/0 bg-white/[0.028] p-5 text-left backdrop-blur-xl transition hover:bg-white/[0.045]"
      data-active={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold tracking-[-0.02em] text-white">{order.orderId}</div>
          <div className="mt-1 text-sm text-[#8f947f]">{order.customer}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-[#6f745d]">Total</div>
          <div className="mt-1 font-medium text-white">{order.totalLabel}</div>
        </div>
        <div>
          <div className="text-[#6f745d]">Ship by</div>
          <div className="mt-1 font-medium text-white">{order.shipBy}</div>
        </div>
        <div>
          <div className="text-[#6f745d]">Updated</div>
          <div className="mt-1 font-medium text-white">{order.updated}</div>
        </div>
      </div>
    </button>
  );
}

function SalesDetail({
  order,
  onView,
  onEdit,
  onAdvance,
  onDelete,
}: {
  order: SalesOrder;
  onView: (order: SalesOrder) => void;
  onEdit: (order: SalesOrder) => void;
  onAdvance: (order: SalesOrder) => void;
  onDelete: (order: SalesOrder) => void;
}) {
  return (
    <PanelShell
      title={`${order.orderId} details`}
      description="Review customer context, item lines, and the next step for fulfillment."
      className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
      actions={
        <>
          <Button onClick={() => onView(order)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
            <Eye className="size-4" />
            View details
          </Button>
          <Button onClick={() => onEdit(order)} className="rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-200">
            <Edit3 className="size-4" />
            Edit
          </Button>
          <Button onClick={() => onAdvance(order)} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white hover:bg-white/[0.06]">
            <CircleArrowOutUpRight className="size-4" />
            Move to next stage
          </Button>
          <Button onClick={() => onDelete(order)} variant="ghost" className="rounded-full text-rose-200 hover:bg-rose-300/10 hover:text-rose-100">
            <Trash2 className="size-4" />
            Remove
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Customer" value={order.customer} helper={`Sales rep: ${order.salesRep}`} />
        <InfoCard label="Order total" value={order.totalLabel} helper={`Payment: ${order.payment}`} />
        <InfoCard label="Dispatch target" value={order.shipBy} helper={`Last updated ${order.updated}`} />
        <div className="rounded-[24px] border border-white/0 bg-white/[0.028] p-5 backdrop-blur-xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Status</div>
          <div className="mt-3">
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-3 text-sm leading-7 text-[#989d89]">Context-sensitive actions stay visible on the detail side.</div>
        </div>
      </div>

      <div className="mt-7 rounded-[28px] border border-white/0 bg-white/[0.028] p-5 backdrop-blur-xl">
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Order line items</h3>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-white/8">
                <TableHead className="text-slate-400">Product</TableHead>
                <TableHead className="text-slate-400">Qty</TableHead>
                <TableHead className="text-slate-400">Value</TableHead>
                <TableHead className="text-slate-400">Line status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={`${order.orderId}-${item.name}`} className="border-white/8">
                  <TableCell className="text-white">{item.name}</TableCell>
                  <TableCell className="text-slate-300">{item.qty}</TableCell>
                  <TableCell className="text-slate-300">{item.price}</TableCell>
                  <TableCell className="text-slate-300">{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-7 rounded-[28px] border border-white/0 bg-white/[0.028] p-6 text-sm leading-8 text-[#a0a591] backdrop-blur-xl">
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Fulfillment note</h3>
        <p className="mt-3">{order.notes}</p>
      </div>
    </PanelShell>
  );
}

function SalesOrders() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [salesView, setSalesView] = useState<SalesView>("All");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogMode, setOrderDialogMode] = useState<"create" | "edit">("create");
  const [orderDialogError, setOrderDialogError] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const loadOrders = async (isActive = true) => {
    try {
      setLoading(true);
      setError("");
      const sales = await getOrdersByType("sale");

      if (!isActive) {
        return;
      }

      const mappedOrders = sales.map(mapSalesOrder);
      setOrders(mappedOrders);
      setSelectedOrderId((current) => {
        const nextSelected = current || mappedOrders[0]?.orderId || "";
        return mappedOrders.some((order) => order.orderId === nextSelected) ? nextSelected : mappedOrders[0]?.orderId || "";
      });
    } catch (loadError) {
      if (!isActive) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load sales orders.");
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  };

  // Sales relies on order, customer, and product freshness for statuses and auto-fill previews.
  useEffect(() => {
    return subscribeToLiveEvents(["orders", "customers", "products"], () => {
      setLiveTick((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;
    void loadOrders(active);
    void (async () => {
      try {
        const data = await getCustomers();
        if (active) {
          setCustomers(data);
        }
      } catch {
        if (active) {
          setCustomers([]);
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

  const handleEditOrder = async (order: SalesOrder) => {
    setSelectedOrderId(order.orderId);
    setOrderDialogMode("edit");
    setOrderDialogError("");
    setOrderDialogOpen(true);
  };

  const handleAdvanceOrder = async (order: SalesOrder) => {
    const nextStatus =
      order.rawStatus === "Quotation" ? "Packing" : order.rawStatus === "Packing" ? "Dispatch" : order.rawStatus === "Dispatch" ? "History" : "History";

    try {
      await updateOrderStatus(order.orderId, nextStatus);
      await loadOrders();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to move order to the next stage.");
    }
  };

  const handleDeleteOrder = async (order: SalesOrder) => {
    setDeleteError("");
    setOrderToDelete(order);
  };

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const matchesView =
        salesView === "All"
          ? true
          : salesView === "Quotations"
            ? order.status === "Quotation"
            : order.status === salesView;

      if (!matchesView) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [order.orderId, order.customer, order.status, order.salesRep].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortKey === "total") {
        return right.total - left.total;
      }

      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [orders, query, salesView, sortKey]);

  const selectedOrder = visibleOrders.find((order) => order.orderId === selectedOrderId) ?? visibleOrders[0];
  const selectedOrderForDialog = orders.find((order) => order.orderId === selectedOrderId);
  const visibleOrderItems = showAllOrders ? visibleOrders : visibleOrders.slice(0, 5);
  const hasMoreOrders = visibleOrders.length > 5;

  useEffect(() => {
    setShowAllOrders(false);
  }, [query, salesView, sortKey]);

  const handleSubmitOrder = async (values: OrderFormValues) => {
    try {
      setOrderSubmitting(true);
      setOrderDialogError("");

      if (orderDialogMode === "create") {
        const createdOrder = await createOrder(toOrderPayload("sale", values));
        setSelectedOrderId(createdOrder.order_id);
      } else if (selectedOrderForDialog) {
        const updatedOrder = await updateOrder(selectedOrderForDialog.orderId, toOrderPayload("sale", values));
        setSelectedOrderId(updatedOrder.order_id);
      }

      setOrderDialogOpen(false);
      await loadOrders();
    } catch (mutationError) {
      setOrderDialogError(mutationError instanceof Error ? mutationError.message : "Unable to save sales order.");
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
      await deleteOrder(orderToDelete.orderId);

      setOrders((currentOrders) => {
        const remainingOrders = currentOrders.filter((order) => order.orderId !== orderToDelete.orderId);
        const nextSelectedOrder = remainingOrders[0];
        setSelectedOrderId((currentSelected) =>
          currentSelected === orderToDelete.orderId ? nextSelectedOrder?.orderId ?? "" : currentSelected
        );
        return remainingOrders;
      });

      setOrderToDelete(null);
      await loadOrders();
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to delete sales order.";
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
            <div className="ops-kicker">Sales telemetry</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">Sales Ops</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#a3a893]">
              Keep order execution moving without losing detail, using the same queue-and-detail rhythm as the history workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Open orders" value={String(orders.length).padStart(2, "0")} helper="Across active customer accounts" />
            <InfoCard label="Quotations" value={String(orders.filter((order) => order.status === "Quotation").length).padStart(2, "0")} helper="Awaiting conversion into fulfillment" />
            <InfoCard label="Packing" value={String(orders.filter((order) => order.status === "Packing").length).padStart(2, "0")} helper="Under warehouse preparation" />
            <InfoCard label="Dispatch" value={String(orders.filter((order) => order.status === "Dispatch").length).padStart(2, "0")} helper="Ready for shipment handoff" />
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
              Add sales order
            </Button>
          </div>
        </div>
      </section>

      <SplitLayout
        ratio="detail"
        left={
          <PanelShell
            title="Sales queue"
            description="Switch between quotations and downstream fulfillment stages, then sort for faster triage."
            className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
          >
            <div className="relative mb-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search orders, customers, or reps"
                className="h-11 rounded-full border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {salesViewOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSalesView(option.key)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] ${
                      salesView === option.key
                        ? "border-[#d6ff2e]/25 bg-[#d6ff2e]/10 text-[#eff8ca]"
                        : "border-white/10 bg-white/[0.03] text-[#8e9480] hover:bg-white/[0.06]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <SortButtons activeKey={sortKey} onChange={setSortKey} />
            </div>
            {loading ? (
              <div className="py-16 text-center text-sm text-[#8f947f]">Loading sales orders...</div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-6 text-sm text-rose-100">{error}</div>
            ) : (
              <>
                <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
                  {visibleOrderItems.map((order) => (
                    <SalesListItem
                      key={order.orderId}
                      order={order}
                      selected={selectedOrder?.orderId === order.orderId}
                      onSelect={() => setSelectedOrderId(order.orderId)}
                    />
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
              <SalesDetail order={selectedOrder} onView={() => setDetailModalOpen(true)} onEdit={handleEditOrder} onAdvance={handleAdvanceOrder} onDelete={handleDeleteOrder} />
            ) : (
              <PanelShell
                title="Order detail"
                description="Select an order from the list to inspect its customer and product lines."
                className="border-white/0 bg-white/[0.025] backdrop-blur-xl"
              >
                <div className="py-16 text-center text-sm text-slate-400">
                  {loading ? "Loading sales orders..." : error ? "Sales orders are unavailable right now." : "No sales orders matched that search."}
                </div>
              </PanelShell>
            )}
          </div>
        }
      />

      <OrderFormDialog
        open={orderDialogOpen}
        mode={orderDialogMode}
        orderType="sale"
        title={orderDialogMode === "create" ? "Create sales order" : "Edit sales order"}
        description="Manage customer, order note, and line items with a validated sales form."
        customers={customers}
        products={products}
        defaultValues={
          orderDialogMode === "edit" && selectedOrderForDialog
            ? {
                status: selectedOrderForDialog.rawStatus,
                notes: selectedOrderForDialog.notes,
                customer_id: selectedOrderForDialog.customerId ?? "",
                products: selectedOrderForDialog.itemsRaw.map((item) => ({
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
              {selectedOrder ? `${selectedOrder.orderId} detail view` : "Sales order detail"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              Modal detail view for fulfillment review and quotation-to-dispatch tracking.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="min-h-0 overflow-y-auto px-6 pb-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Customer" value={selectedOrder.customer} helper={`Sales rep: ${selectedOrder.salesRep}`} />
                <InfoCard label="Order total" value={selectedOrder.totalLabel} helper={`Payment: ${selectedOrder.payment}`} />
                <InfoCard label="Dispatch target" value={selectedOrder.shipBy} helper={`Last updated ${selectedOrder.updated}`} />
                <div className="ops-telemetry p-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">Status</div>
                  <div className="mt-3">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
              </div>

              <div className="ops-telemetry mt-7 rounded-[28px] p-5">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Order line items</h3>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/8">
                        <TableHead className="text-slate-400">Product</TableHead>
                        <TableHead className="text-slate-400">Qty</TableHead>
                        <TableHead className="text-slate-400">Value</TableHead>
                        <TableHead className="text-slate-400">Line status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={`${selectedOrder.orderId}-modal-${item.name}`} className="border-white/8">
                          <TableCell className="text-white">{item.name}</TableCell>
                          <TableCell className="text-slate-300">{item.qty}</TableCell>
                          <TableCell className="text-slate-300">{item.price}</TableCell>
                          <TableCell className="text-slate-300">{item.status}</TableCell>
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
              Remove sales order
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              {orderToDelete
                ? `Delete sales order ${orderToDelete.orderId} for ${orderToDelete.customer}. This cannot be undone.`
                : "Delete this sales order."}
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

export default SalesOrders;
