import "dotenv/config";

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import app from "../app.js";
import { prisma } from "../lib/db.js";
import { getActiveSessionCount } from "../lib/sessionStore.js";

let server: Awaited<ReturnType<typeof app.listen>>;
let baseUrl = "";
let authToken = "";

async function jsonRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => null);

  return { response, body };
}

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  const { response, body } = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.APP_USER,
      password: "Inventiq@123",
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(body?.token);
  authToken = body.token as string;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  await prisma.$disconnect();
});

describe("api runtime smoke tests", () => {
  it("serves health publicly", async () => {
    const { response, body } = await jsonRequest("/health");
    assert.equal(response.status, 200);
    assert.equal(body?.status, "API is running");
  });

  it("rejects protected product access without a token", async () => {
    const { response, body } = await jsonRequest("/products");
    assert.equal(response.status, 401);
    assert.match(String(body?.error), /Unauthorized|token/i);
  });

  it("returns products with auth", async () => {
    const { response, body } = await jsonRequest("/products", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  it("validates product creation payloads", async () => {
    const { response, body } = await jsonRequest("/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        product_code: "TEST-PROD-INVALID",
        price: 10,
        quantity: 2,
        weight: 1,
      }),
    });

    assert.equal(response.status, 400);
    assert.ok(body?.error);
  });

  it("returns sales orders with auth", async () => {
    const { response, body } = await jsonRequest("/orders?type=sale", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  it("validates order creation payloads", async () => {
    const { response, body } = await jsonRequest("/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: "invalid",
        products: [],
      }),
    });

    assert.equal(response.status, 400);
    assert.ok(body?.error);
  });

  it("returns manufacturing batches with auth", async () => {
    const { response, body } = await jsonRequest("/batches", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  it("validates customer creation payloads", async () => {
    const { response, body } = await jsonRequest("/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customer_id: "",
        name: "",
        contact: "",
        address: "",
      }),
    });

    assert.equal(response.status, 400);
    assert.ok(body?.error);
  });

  it("validates supplier creation payloads", async () => {
    const { response, body } = await jsonRequest("/suppliers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        supplier_id: "",
        name: "",
        contact: "",
        address: "",
      }),
    });

    assert.equal(response.status, 400);
    assert.ok(body?.error);
  });

  it("creates an order with 100+ line items in under 3 seconds", async () => {
    const products = await prisma.product.findMany({
      take: 10,
      orderBy: { product_code: "asc" },
    });

    assert.ok(products.length > 0);

    const lines = Array.from({ length: 100 }, (_, index) => {
      const product = products[index % products.length];
      assert.ok(product);
      return {
        product_code: product.product_code,
        quantity: 1,
        unit_price: product.price,
      };
    });

    const startedAt = performance.now();
    const { response, body } = await jsonRequest("/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        type: "sale",
        customer_id: "CUST-001",
        products: lines,
      }),
    });
    const elapsedMs = performance.now() - startedAt;

    assert.equal(response.status, 201);
    assert.ok(elapsedMs < 3000, `Expected order creation under 3000ms, got ${elapsedMs.toFixed(2)}ms`);

    await prisma.order.delete({ where: { order_id: body.order_id as string } });
  });

  it("returns dashboard summary in under 2 seconds", async () => {
    const startedAt = performance.now();
    const { response } = await jsonRequest("/dashboard/summary", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const elapsedMs = performance.now() - startedAt;

    assert.equal(response.status, 200);
    assert.ok(elapsedMs < 2000, `Expected dashboard summary under 2000ms, got ${elapsedMs.toFixed(2)}ms`);
  });

  it("keeps active sessions capped at 5", async () => {
    const tokens: string[] = [];

    for (let index = 0; index < 4; index += 1) {
      const { response, body } = await jsonRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: process.env.APP_USER,
          password: "Inventiq@123",
        }),
      });

      assert.equal(response.status, 200);
      assert.ok(body?.token);
      tokens.push(body.token as string);
    }

    const sessionCount = await getActiveSessionCount();
    assert.ok(sessionCount <= 5);

    const blocked = await jsonRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.APP_USER,
        password: "Inventiq@123",
      }),
    });

    assert.equal(blocked.response.status, 429);

    for (const token of tokens) {
      await jsonRequest("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
