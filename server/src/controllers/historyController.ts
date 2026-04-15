/*
logs / audit trail
system tracking
Might later become a service instead of controller
*/
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/db.js";

type HistoryType = "Sales" | "Purchases" | "Manufacturing";

type HistoryRecord = {
  id: string;
  type: HistoryType;
  reference: string;
  actor: string;
  status: string;
  amount: string;
  date: string;
  detail: string;
};

const formatAmount = (value: number) => `Rs ${value.toFixed(2)}`;

export const getHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const typeFilter = String(req.query.type ?? "all").toLowerCase();

    const [orders, batches, inventoryLogs, activityLogs] = await Promise.all([
      prisma.order.findMany({
        include: {
          customer: true,
          supplier: true,
        },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.manufacturing.findMany({
        orderBy: { start_date: "desc" },
        take: 30,
      }),
      prisma.inventoryLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 50,
      }),
      prisma.activityLog.findMany({
        orderBy: { created_at: "desc" },
        take: 50,
      }),
    ]);

    const orderRecords: HistoryRecord[] = orders
      .filter((order) =>
        typeFilter === "all"
          ? true
          : typeFilter === "sales"
            ? order.type === "sale"
            : order.type === "purchase"
      )
      .map((order) => {
        const items = Array.isArray(order.products) ? (order.products as Array<{ quantity?: number }>) : [];
        const amount = items.length > 0 ? 0 : 0;

        return {
          id: `order-${order.order_id}`,
          type: order.type === "sale" ? "Sales" : "Purchases",
          reference: order.order_id,
          actor: order.customer?.name ?? order.supplier?.name ?? "System",
          status: order.status,
          amount: formatAmount(amount),
          date: order.date.toISOString(),
          detail: order.notes ?? `${order.type} order recorded`,
        };
      });

    const manufacturingRecords: HistoryRecord[] =
      typeFilter === "all" || typeFilter === "manufacturing"
        ? batches.map((batch) => ({
            id: `batch-${batch.batch_number}`,
            type: "Manufacturing",
            reference: batch.batch_number,
            actor: "Production",
            status: batch.status,
            amount: formatAmount(0),
            date: (batch.end_date ?? batch.start_date).toISOString(),
            detail: `Batch ${batch.batch_number} is currently ${batch.status}`,
          }))
        : [];

    const inventoryRecords: HistoryRecord[] =
      typeFilter === "all"
        ? inventoryLogs.map((log) => ({
            id: `inventory-${log.id}`,
            type: log.reason.toLowerCase().includes("sale")
              ? "Sales"
              : log.reason.toLowerCase().includes("purchase")
                ? "Purchases"
                : "Manufacturing",
            reference: log.product_code,
            actor: "Inventory",
            status: log.change_type,
            amount: formatAmount(0),
            date: log.timestamp.toISOString(),
            detail: `${log.reason} (${log.change} units)`,
          }))
        : [];

    const activityRecords: HistoryRecord[] =
      typeFilter === "all"
        ? activityLogs.map((log) => ({
            id: `activity-${log.id}`,
            type: log.entity === "manufacturing"
              ? "Manufacturing"
              : log.entity === "order"
                ? "Sales"
                : "Purchases",
            reference: log.entity_id,
            actor: "System",
            status: log.action,
            amount: formatAmount(0),
            date: log.created_at.toISOString(),
            detail: `${log.action} on ${log.entity}`,
          }))
        : [];

    const records = [...orderRecords, ...manufacturingRecords, ...inventoryRecords, ...activityRecords]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 100);

    res.json(records);
  } catch (error) {
    next(error);
  }
};
