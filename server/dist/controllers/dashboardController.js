import { prisma } from "../lib/db.js";
const LOW_STOCK_THRESHOLD = 50;
const sumOrderAmount = (products) => {
    if (!Array.isArray(products)) {
        return 0;
    }
    return products.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unit_price ?? 0), 0);
};
const sumBatchQuantity = (items) => {
    if (!Array.isArray(items)) {
        return 0;
    }
    return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
};
const getOrderTone = (status) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("dispatch") || normalized.includes("complete")) {
        return "emerald";
    }
    if (normalized.includes("pick") || normalized.includes("progress")) {
        return "amber";
    }
    return "rose";
};
const getBatchTone = (status) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("complete")) {
        return "emerald";
    }
    if (normalized.includes("wip")) {
        return "amber";
    }
    return "rose";
};
const formatTrendLabel = (value) => new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
}).format(value);
const getManufacturingStage = (batch) => {
    const normalized = batch.status.toLowerCase();
    if (normalized.includes("plan")) {
        return "planned";
    }
    if (normalized.includes("complete")) {
        return "completed";
    }
    const ageInDays = (Date.now() - batch.start_date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 7) {
        return "delayed";
    }
    return "inProgress";
};
const buildContributionSplit = (entries) => {
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    const topEntry = entries[0];
    if (!topEntry || total === 0) {
        return {
            leader: "No data",
            leaderValue: 0,
            leaderShare: 0,
            otherShare: 100,
        };
    }
    const leaderShare = Math.round((topEntry.value / total) * 100);
    return {
        leader: topEntry.name,
        leaderValue: topEntry.value,
        leaderShare,
        otherShare: Math.max(0, 100 - leaderShare),
    };
};
export const getDashboardSummaryHandler = async (_req, res, next) => {
    try {
        const [products, salesOrders, purchaseOrders, batches] = await Promise.all([
            prisma.product.findMany(),
            prisma.order.findMany({
                where: { type: "sale" },
                include: { customer: true },
                orderBy: { date: "desc" },
            }),
            prisma.order.findMany({
                where: { type: "purchase" },
                include: { supplier: true },
                orderBy: { date: "desc" },
            }),
            prisma.manufacturing.findMany({
                orderBy: { start_date: "desc" },
            }),
        ]);
        const inventoryValue = products.reduce((sum, product) => sum + product.price * product.quantity, 0);
        const lowStockCount = products.filter((product) => product.quantity <= LOW_STOCK_THRESHOLD).length;
        const pendingOrders = [...salesOrders, ...purchaseOrders].filter((order) => !order.status.toLowerCase().includes("complete")).length;
        const activeBatches = batches.filter((batch) => !batch.status.toLowerCase().includes("complete")).length;
        const nearingCompletion = batches.filter((batch) => {
            const rawTotal = sumBatchQuantity(batch.raw_materials);
            const outputTotal = sumBatchQuantity(batch.output);
            return rawTotal > 0 && outputTotal / rawTotal >= 0.75;
        }).length;
        const inventoryHealthRaw = {
            healthy: 0,
            low: 0,
            out: 0,
            overstocked: 0,
        };
        for (const product of products) {
            if (product.quantity === 0) {
                inventoryHealthRaw.out += 1;
            }
            else if (product.quantity <= LOW_STOCK_THRESHOLD) {
                inventoryHealthRaw.low += 1;
            }
            else if (product.quantity >= 250) {
                inventoryHealthRaw.overstocked += 1;
            }
            else {
                inventoryHealthRaw.healthy += 1;
            }
        }
        const trendMap = new Map();
        for (const order of salesOrders) {
            const bucket = order.date.toISOString().slice(0, 10);
            const existing = trendMap.get(bucket) ?? {
                label: formatTrendLabel(order.date),
                sales: 0,
                purchases: 0,
                sortKey: order.date.getTime(),
            };
            existing.sales += sumOrderAmount(order.products);
            trendMap.set(bucket, existing);
        }
        for (const order of purchaseOrders) {
            const bucket = order.date.toISOString().slice(0, 10);
            const existing = trendMap.get(bucket) ?? {
                label: formatTrendLabel(order.date),
                sales: 0,
                purchases: 0,
                sortKey: order.date.getTime(),
            };
            existing.purchases += sumOrderAmount(order.products);
            trendMap.set(bucket, existing);
        }
        const salesByCustomer = new Map();
        for (const order of salesOrders) {
            const customerName = order.customer?.name ?? order.customer_id ?? "Customer account";
            const existing = salesByCustomer.get(customerName) ?? { revenue: 0, orders: 0 };
            existing.revenue += sumOrderAmount(order.products);
            existing.orders += 1;
            salesByCustomer.set(customerName, existing);
        }
        const purchasesBySupplier = new Map();
        for (const order of purchaseOrders) {
            const supplierName = order.supplier?.name ?? order.supplier_id ?? "Supplier account";
            purchasesBySupplier.set(supplierName, (purchasesBySupplier.get(supplierName) ?? 0) + sumOrderAmount(order.products));
        }
        const topCustomers = [...salesByCustomer.entries()]
            .map(([name, value]) => ({
            name,
            revenue: value.revenue,
            orders: value.orders,
        }))
            .sort((left, right) => right.revenue - left.revenue)
            .slice(0, 5);
        const topSuppliers = [...purchasesBySupplier.entries()]
            .map(([name, value]) => ({
            name,
            value,
        }))
            .sort((left, right) => right.value - left.value);
        const salesContribution = buildContributionSplit(topCustomers.map((customer) => ({
            name: customer.name,
            value: customer.revenue,
        })));
        const supplierContribution = buildContributionSplit(topSuppliers);
        const statusPipeline = {
            sales: {
                quotation: salesOrders.filter((order) => order.status === "Quotation").length,
                packing: salesOrders.filter((order) => order.status === "Packing").length,
                dispatch: salesOrders.filter((order) => order.status === "Dispatch").length,
                history: salesOrders.filter((order) => order.status === "History").length,
            },
            purchases: {
                quotations: purchaseOrders.filter((order) => order.status === "Quotations Received").length,
                unpaid: purchaseOrders.filter((order) => order.status === "Unpaid").length,
                paid: purchaseOrders.filter((order) => order.status === "Paid").length,
                completion: purchaseOrders.filter((order) => order.status === "Order Completion").length,
                history: purchaseOrders.filter((order) => order.status === "History").length,
            },
            manufacturing: {
                planned: batches.filter((batch) => getManufacturingStage(batch) === "planned").length,
                inProgress: batches.filter((batch) => getManufacturingStage(batch) === "inProgress").length,
                completed: batches.filter((batch) => getManufacturingStage(batch) === "completed").length,
                delayed: batches.filter((batch) => getManufacturingStage(batch) === "delayed").length,
            },
        };
        const salesPressure = salesOrders.slice(0, 3).map((order) => ({
            id: order.order_id,
            customer: order.customer?.name ?? "Customer account",
            amount: `Rs ${sumOrderAmount(order.products).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
            status: order.status,
            tone: getOrderTone(order.status),
        }));
        const wipOverview = batches.slice(0, 3).map((batch) => {
            const rawTotal = sumBatchQuantity(batch.raw_materials);
            const outputTotal = sumBatchQuantity(batch.output);
            const completion = rawTotal > 0 ? Math.min(100, Math.round((outputTotal / rawTotal) * 100)) : 0;
            return {
                batch: batch.batch_number,
                line: Array.isArray(batch.output) && batch.output.length > 1 ? "Assembly Cell" : "Packaging Line",
                completion: `${completion}%`,
                status: batch.status,
                tone: getBatchTone(batch.status),
            };
        });
        const stockSignals = [
            {
                label: "Low stock alerts",
                value: String(lowStockCount).padStart(2, "0"),
                detail: "Products at or below the low-stock threshold",
            },
            {
                label: "Inbound POs",
                value: String(purchaseOrders.length).padStart(2, "0"),
                detail: "Recent purchase orders currently visible to operations",
            },
            {
                label: "Sales requiring action",
                value: String(salesOrders.filter((order) => !order.status.toLowerCase().includes("dispatch")).length).padStart(2, "0"),
                detail: "Sales orders still moving through fulfillment",
            },
        ];
        res.json({
            salesPurchasesTrend: [...trendMap.values()]
                .sort((left, right) => left.sortKey - right.sortKey)
                .slice(-8)
                .map(({ sortKey: _sortKey, ...item }) => item),
            statusPipeline,
            topCustomers,
            inventoryHealth: [
                { label: "Healthy", value: inventoryHealthRaw.healthy, tone: "emerald" },
                { label: "Low stock", value: inventoryHealthRaw.low, tone: "amber" },
                { label: "Out of stock", value: inventoryHealthRaw.out, tone: "rose" },
                { label: "Overstocked", value: inventoryHealthRaw.overstocked, tone: "sky" },
            ],
            contributionSplit: {
                customers: salesContribution,
                suppliers: supplierContribution,
            },
            summaryCards: [
                {
                    title: "Inventory value",
                    value: inventoryValue,
                    change: `${products.length} stocked products`,
                    tone: "amber",
                },
                {
                    title: "Pending orders",
                    value: pendingOrders,
                    change: `${salesOrders.length} recent sales, ${purchaseOrders.length} recent purchases`,
                    tone: "emerald",
                },
                {
                    title: "WIP status",
                    value: activeBatches,
                    change: `${nearingCompletion} nearing completion`,
                    tone: "sky",
                },
            ],
            salesPressure,
            wipOverview,
            stockSignals,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=dashboardController.js.map