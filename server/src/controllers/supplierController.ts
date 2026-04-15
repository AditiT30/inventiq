/*
manage suppliers
link to products
*/
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/db.js";
import { publishLiveEvent } from "../lib/liveEvents.js";

const getSingleParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`${name} is required`, 400);
  }

  return value;
};

const supplierCreateSchema = z.object({
  supplier_id: z.string().min(1, "supplier_id is required"),
  name: z.string().min(1, "name is required"),
  contact: z.string().min(1, "contact is required"),
  address: z.string().min(1, "address is required"),
});

const supplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided for update",
});

export const getAllSuppliersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  } catch (error) {
    next(error);
  }
};

export const getSupplierByIdHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier_id = getSingleParam(req.params.supplier_id, "supplier_id");
    const supplier = await prisma.supplier.findUnique({
      where: { supplier_id },
      include: {
        orders: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    res.json(supplier);
  } catch (error) {
    next(error);
  }
};

export const createSupplierHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { supplier_id, name, contact, address } = supplierCreateSchema.parse(req.body);

    const supplier = await prisma.supplier.create({
      data: { supplier_id, name, contact, address },
    });

    // Purchase forms subscribe to supplier changes for auto-fill and lookup freshness.
    publishLiveEvent({
      action: "created",
      entity: "supplier",
      channels: ["suppliers", "orders"],
      id: supplier.supplier_id,
    });
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
};

export const updateSupplierHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier_id = getSingleParam(req.params.supplier_id, "supplier_id");
    const { name, contact, address } = supplierUpdateSchema.parse(req.body);

    const existingSupplier = await prisma.supplier.findUnique({
      where: { supplier_id },
    });

    if (!existingSupplier) {
      throw new AppError("Supplier not found", 404);
    }

    const supplier = await prisma.supplier.update({
      where: { supplier_id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(contact !== undefined ? { contact } : {}),
        ...(address !== undefined ? { address } : {}),
      },
    });

    // Supplier edits should refresh both supplier pages and purchase-side lookups.
    publishLiveEvent({
      action: "updated",
      entity: "supplier",
      channels: ["suppliers", "orders"],
      id: supplier.supplier_id,
    });
    res.json(supplier);
  } catch (error) {
    next(error);
  }
};

export const deleteSupplierHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier_id = getSingleParam(req.params.supplier_id, "supplier_id");

    const existingSupplier = await prisma.supplier.findUnique({
      where: { supplier_id },
    });

    if (!existingSupplier) {
      throw new AppError("Supplier not found", 404);
    }

    await prisma.supplier.delete({
      where: { supplier_id },
    });

    // Only publish after the supplier row is removed successfully.
    publishLiveEvent({
      action: "deleted",
      entity: "supplier",
      channels: ["suppliers", "orders"],
      id: supplier_id,
    });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    next(error);
  }
};
