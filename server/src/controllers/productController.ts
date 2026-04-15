
/*
create product
update product
list products
delete products
*/
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/db.js";
import { publishLiveEvent } from "../lib/liveEvents.js";

const getSingleParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`${name} is required`, 400);
  }

  return value;
};

const validateProductPayload = (body: Request["body"], isPartial = false) => {
  const requiredFields = ["product_code", "name", "weight", "price", "quantity"] as const;

  if (!isPartial) {
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        throw new AppError(`${field} is required`, 400);
      }
    }
  }

  if (body.weight !== undefined && (Number.isNaN(Number(body.weight)) || Number(body.weight) < 0)) {
    throw new AppError("weight must be a non-negative number", 400);
  }

  if (body.price !== undefined && (Number.isNaN(Number(body.price)) || Number(body.price) < 0)) {
    throw new AppError("price must be a non-negative number", 400);
  }

  if (body.quantity !== undefined && (!Number.isInteger(Number(body.quantity)) || Number(body.quantity) < 0)) {
    throw new AppError("quantity must be a non-negative integer", 400);
  }
};

export const getAllProductsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { last_updated: "desc" },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductByCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product_code = getSingleParam(req.params.product_code, "product_code");
    const product = await prisma.product.findUnique({
      where: { product_code },
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const createProductHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateProductPayload(req.body);

    const product = await prisma.product.create({
      data: {
        product_code: req.body.product_code,
        name: req.body.name,
        description: req.body.description ?? null,
        weight: Number(req.body.weight),
        price: Number(req.body.price),
        quantity: Number(req.body.quantity),
      },
    });

    // Publish only after Prisma confirms the write so subscribers never react to failed mutations.
    publishLiveEvent({
      action: "created",
      entity: "product",
      channels: ["products", "dashboard"],
      id: product.product_code,
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProductHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product_code = getSingleParam(req.params.product_code, "product_code");
    validateProductPayload(req.body, true);

    const existingProduct = await prisma.product.findUnique({
      where: { product_code },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    const product = await prisma.product.update({
      where: { product_code },
      data: {
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body.weight !== undefined ? { weight: Number(req.body.weight) } : {}),
        ...(req.body.price !== undefined ? { price: Number(req.body.price) } : {}),
        ...(req.body.quantity !== undefined ? { quantity: Number(req.body.quantity) } : {}),
      },
    });

    // Dashboard depends on product stock/value, so product mutations also fan out there.
    publishLiveEvent({
      action: "updated",
      entity: "product",
      channels: ["products", "dashboard"],
      id: product.product_code,
    });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const deleteProductHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product_code = getSingleParam(req.params.product_code, "product_code");

    const existingProduct = await prisma.product.findUnique({
      where: { product_code },
    });

    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    await prisma.product.delete({
      where: { product_code },
    });

    // Deletion is broadcast after the row is actually removed.
    publishLiveEvent({
      action: "deleted",
      entity: "product",
      channels: ["products", "dashboard"],
      id: product_code,
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};
