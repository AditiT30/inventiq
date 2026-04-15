import "dotenv/config";

import { prisma } from "../lib/db.js";

const products = [
  { product_code: "EC-001", name: "ESP32 Control Module", description: "Wi-Fi and Bluetooth microcontroller board for smart electronics.", weight: 0.08, price: 520, quantity: 180 },
  { product_code: "EC-002", name: "STM32 MCU Board", description: "Industrial microcontroller board for embedded controller assemblies.", weight: 0.07, price: 760, quantity: 96 },
  { product_code: "EC-003", name: "Power MOSFET Pack", description: "High-efficiency switching component set for power electronics.", weight: 0.03, price: 145, quantity: 420 },
  { product_code: "EC-004", name: "Buck Converter Module", description: "DC-DC step-down regulation module for control systems.", weight: 0.06, price: 210, quantity: 210 },
  { product_code: "EC-005", name: "OLED Display 2.4in", description: "Compact user interface display for smart instrumentation.", weight: 0.09, price: 390, quantity: 84 },
  { product_code: "EC-006", name: "IoT Sensor Array", description: "Environmental sensing board for smart facility monitoring.", weight: 0.11, price: 880, quantity: 52 },
  { product_code: "EC-007", name: "Li-Ion Battery Pack 2200mAh", description: "Rechargeable battery pack for handheld and portable electronics.", weight: 0.18, price: 460, quantity: 130 },
  { product_code: "EC-008", name: "USB-C Power Delivery Board", description: "Power negotiation board for high-speed USB-C charging products.", weight: 0.05, price: 310, quantity: 74 },
  { product_code: "EC-009", name: "Solid State Relay Board", description: "Relay switching board for industrial load control.", weight: 0.12, price: 670, quantity: 44 },
  { product_code: "EC-010", name: "Hall Effect Sensor", description: "Magnetic field sensor for motor and position feedback circuits.", weight: 0.01, price: 58, quantity: 680 },
  { product_code: "EC-011", name: "PCB Terminal Block Set", description: "Terminal connectors for control panel and PCB assemblies.", weight: 0.04, price: 36, quantity: 920 },
  { product_code: "EC-012", name: "Switch Mode Power Supply", description: "24V regulated power supply unit for electronics cabinets.", weight: 0.65, price: 1480, quantity: 38 },
  { product_code: "EC-013", name: "Thermal Interface Pad", description: "Heat transfer pad for power management and processor cooling.", weight: 0.02, price: 24, quantity: 1100 },
  { product_code: "EC-014", name: "Motor Driver IC Set", description: "Integrated motor control driver package for robotics and conveyors.", weight: 0.03, price: 195, quantity: 260 },
  { product_code: "EC-015", name: "Antenna Module 2.4GHz", description: "Compact wireless antenna module for IoT and telemetry devices.", weight: 0.02, price: 130, quantity: 340 },
  { product_code: "FG-101", name: "Smart Relay Controller", description: "Finished electronic control unit for industrial relay automation.", weight: 0.85, price: 4850, quantity: 32 },
  { product_code: "FG-102", name: "Portable Diagnostic Meter", description: "Finished handheld test instrument for electrical diagnostics.", weight: 0.62, price: 6240, quantity: 18 },
  { product_code: "FG-103", name: "Industrial Sensor Hub", description: "Finished edge gateway for multi-sensor electronics deployment.", weight: 1.1, price: 7850, quantity: 26 },
  { product_code: "FG-104", name: "Battery Management Console", description: "Finished electronics console for battery monitoring and alerts.", weight: 1.4, price: 9320, quantity: 14 },
  { product_code: "FG-105", name: "Smart Power Distribution Unit", description: "Finished rack-ready distribution unit for intelligent load control.", weight: 2.4, price: 12450, quantity: 9 },
  { product_code: "FG-106", name: "Edge Telemetry Node", description: "Finished communications node for remote equipment telemetry.", weight: 0.94, price: 5680, quantity: 21 },
  { product_code: "FG-107", name: "Compact Vision Inspection Unit", description: "Finished quality-inspection electronics module with camera I/O.", weight: 1.65, price: 15800, quantity: 7 },
];

const customers = [
  { customer_id: "CUST-001", name: "Apex Automation Retail", contact: "+91-987650001", address: "Mumbai, Maharashtra" },
  { customer_id: "CUST-002", name: "Northline Electronics Supply", contact: "+91-987650002", address: "Delhi, India" },
  { customer_id: "CUST-003", name: "Metro Smart Systems", contact: "+91-987650003", address: "Bengaluru, Karnataka" },
  { customer_id: "CUST-004", name: "Vertex Components House", contact: "+91-987650004", address: "Hyderabad, Telangana" },
  { customer_id: "CUST-005", name: "BlueGrid Industrial Tech", contact: "+91-987650005", address: "Pune, Maharashtra" },
  { customer_id: "CUST-006", name: "Eastern Power Devices", contact: "+91-987650006", address: "Kolkata, West Bengal" },
];

const suppliers = [
  { supplier_id: "SUP-001", name: "Nova Industrial Supply", contact: "+91-912340001", address: "Pune, Maharashtra" },
  { supplier_id: "SUP-002", name: "Axis Motion Works", contact: "+91-912340002", address: "Ahmedabad, Gujarat" },
  { supplier_id: "SUP-003", name: "VoltCore Systems", contact: "+91-912340003", address: "Chennai, Tamil Nadu" },
  { supplier_id: "SUP-004", name: "Prime Silicon Components", contact: "+91-912340004", address: "Noida, Uttar Pradesh" },
  { supplier_id: "SUP-005", name: "Electra Module Labs", contact: "+91-912340005", address: "Bengaluru, Karnataka" },
  { supplier_id: "SUP-006", name: "GreenCell Battery Tech", contact: "+91-912340006", address: "Vadodara, Gujarat" },
];

const saleOrders = [
  { order_id: "SO-1098", type: "sale", status: "Dispatch", notes: "Packed and ready for vehicle assignment.", customer_id: "CUST-001", date: new Date("2026-04-11T10:10:00Z"), products: [{ product_code: "FG-101", quantity: 6, unit_price: 4850 }, { product_code: "EC-005", quantity: 20, unit_price: 390 }] },
  { order_id: "SO-1099", type: "sale", status: "Packing", notes: "QC clearance complete; final packing under progress.", customer_id: "CUST-002", date: new Date("2026-04-12T08:30:00Z"), products: [{ product_code: "FG-103", quantity: 4, unit_price: 7850 }, { product_code: "EC-006", quantity: 10, unit_price: 880 }] },
  { order_id: "SO-1100", type: "sale", status: "Quotation", notes: "Awaiting commercial approval from customer finance team.", customer_id: "CUST-003", date: new Date("2026-04-12T15:20:00Z"), products: [{ product_code: "FG-104", quantity: 2, unit_price: 9320 }, { product_code: "EC-007", quantity: 24, unit_price: 460 }] },
  { order_id: "SO-1101", type: "sale", status: "Dispatch", notes: "High-priority replenishment for field deployment.", customer_id: "CUST-004", date: new Date("2026-04-13T09:00:00Z"), products: [{ product_code: "FG-106", quantity: 5, unit_price: 5680 }, { product_code: "EC-015", quantity: 40, unit_price: 130 }] },
  { order_id: "SO-1102", type: "sale", status: "Packing", notes: "Split shipment due to limited finished goods inventory.", customer_id: "CUST-005", date: new Date("2026-04-13T13:45:00Z"), products: [{ product_code: "FG-102", quantity: 3, unit_price: 6240 }, { product_code: "EC-008", quantity: 18, unit_price: 310 }] },
  { order_id: "SO-1103", type: "sale", status: "Quotation", notes: "Quotation revised for service bundle and warranty add-on.", customer_id: "CUST-006", date: new Date("2026-04-14T07:15:00Z"), products: [{ product_code: "FG-105", quantity: 1, unit_price: 12450 }, { product_code: "EC-012", quantity: 8, unit_price: 1480 }] },
];

const purchaseOrders = [
  { order_id: "PO-4031", type: "purchase", status: "Quotations Received", notes: "Supplier submitted updated pricing for bulk microcontrollers.", supplier_id: "SUP-001", date: new Date("2026-04-10T11:30:00Z"), products: [{ product_code: "EC-001", quantity: 120, unit_price: 520 }, { product_code: "EC-003", quantity: 300, unit_price: 145 }] },
  { order_id: "PO-4032", type: "purchase", status: "Paid", notes: "Advance payment released for expedited battery shipment.", supplier_id: "SUP-006", date: new Date("2026-04-11T09:10:00Z"), products: [{ product_code: "EC-007", quantity: 150, unit_price: 460 }] },
  { order_id: "PO-4033", type: "purchase", status: "Unpaid", notes: "Commercial terms under review before payment release.", supplier_id: "SUP-004", date: new Date("2026-04-12T06:50:00Z"), products: [{ product_code: "EC-002", quantity: 90, unit_price: 760 }, { product_code: "EC-014", quantity: 120, unit_price: 195 }] },
  { order_id: "PO-4034", type: "purchase", status: "Order Completion", notes: "Shipment received and inward entry completed.", supplier_id: "SUP-003", date: new Date("2026-04-12T14:40:00Z"), products: [{ product_code: "EC-009", quantity: 70, unit_price: 670 }, { product_code: "EC-004", quantity: 110, unit_price: 210 }] },
  { order_id: "PO-4035", type: "purchase", status: "Quotations Received", notes: "Need alternate quote for display modules and telemetry antennas.", supplier_id: "SUP-005", date: new Date("2026-04-13T10:00:00Z"), products: [{ product_code: "EC-005", quantity: 85, unit_price: 390 }, { product_code: "EC-015", quantity: 160, unit_price: 130 }] },
  { order_id: "PO-4036", type: "purchase", status: "Paid", notes: "Power supply and terminal blocks prioritized for line B.", supplier_id: "SUP-002", date: new Date("2026-04-14T05:30:00Z"), products: [{ product_code: "EC-011", quantity: 400, unit_price: 36 }, { product_code: "EC-012", quantity: 45, unit_price: 1480 }] },
];

const manufacturingBatches = [
  {
    batch_number: "BATCH-201",
    status: "WIP",
    start_date: new Date("2026-04-13T08:00:00Z"),
    end_date: null,
    raw_materials: [
      { product_code: "EC-001", quantity: 20 },
      { product_code: "EC-004", quantity: 20 },
      { product_code: "EC-005", quantity: 20 },
      { product_code: "EC-011", quantity: 40 },
    ],
    output: [{ product_code: "FG-101", quantity: 12 }],
  },
  {
    batch_number: "BATCH-202",
    status: "WIP",
    start_date: new Date("2026-04-13T12:30:00Z"),
    end_date: null,
    raw_materials: [
      { product_code: "EC-006", quantity: 15 },
      { product_code: "EC-015", quantity: 20 },
      { product_code: "EC-012", quantity: 10 },
    ],
    output: [{ product_code: "FG-103", quantity: 8 }],
  },
  {
    batch_number: "BATCH-203",
    status: "Completed",
    start_date: new Date("2026-04-12T07:45:00Z"),
    end_date: new Date("2026-04-12T16:00:00Z"),
    raw_materials: [
      { product_code: "EC-007", quantity: 12 },
      { product_code: "EC-008", quantity: 12 },
      { product_code: "EC-010", quantity: 24 },
    ],
    output: [{ product_code: "FG-106", quantity: 10 }],
  },
  {
    batch_number: "BATCH-204",
    status: "Needs Material",
    start_date: new Date("2026-04-14T04:20:00Z"),
    end_date: null,
    raw_materials: [
      { product_code: "EC-002", quantity: 55 },
      { product_code: "EC-009", quantity: 20 },
      { product_code: "EC-013", quantity: 30 },
    ],
    output: [{ product_code: "FG-104", quantity: 6 }],
  },
];

const inventoryLogs = [
  { product_code: "FG-101", change_type: "DEDUCT", change: -6, quantity: 6, reason: "Sale Order SO-1098", timestamp: new Date("2026-04-11T12:15:00Z") },
  { product_code: "FG-103", change_type: "DEDUCT", change: -4, quantity: 4, reason: "Sale Order SO-1099", timestamp: new Date("2026-04-12T10:05:00Z") },
  { product_code: "EC-009", change_type: "ADD", change: 70, quantity: 70, reason: "Purchase Order PO-4034", timestamp: new Date("2026-04-12T15:30:00Z") },
  { product_code: "EC-004", change_type: "ADD", change: 110, quantity: 110, reason: "Purchase Order PO-4034", timestamp: new Date("2026-04-12T15:31:00Z") },
  { product_code: "EC-001", change_type: "DEDUCT", change: -20, quantity: 20, reason: "Manufacturing Batch BATCH-201", timestamp: new Date("2026-04-13T08:05:00Z") },
  { product_code: "EC-004", change_type: "DEDUCT", change: -20, quantity: 20, reason: "Manufacturing Batch BATCH-201", timestamp: new Date("2026-04-13T08:05:30Z") },
  { product_code: "FG-106", change_type: "ADD", change: 10, quantity: 10, reason: "Manufacturing Batch BATCH-203", timestamp: new Date("2026-04-12T16:05:00Z") },
  { product_code: "EC-007", change_type: "ADD", change: 150, quantity: 150, reason: "Purchase Order PO-4032", timestamp: new Date("2026-04-11T13:10:00Z") },
];

const activityLogs = [
  { action: "Created", entity: "order", entity_id: "SO-1098", created_at: new Date("2026-04-11T10:10:00Z") },
  { action: "Created", entity: "order", entity_id: "SO-1099", created_at: new Date("2026-04-12T08:30:00Z") },
  { action: "Created", entity: "order", entity_id: "PO-4034", created_at: new Date("2026-04-12T14:40:00Z") },
  { action: "Completed", entity: "manufacturing", entity_id: "BATCH-203", created_at: new Date("2026-04-12T16:00:00Z") },
  { action: "Started", entity: "manufacturing", entity_id: "BATCH-201", created_at: new Date("2026-04-13T08:00:00Z") },
  { action: "Started", entity: "manufacturing", entity_id: "BATCH-202", created_at: new Date("2026-04-13T12:30:00Z") },
  { action: "Seeded", entity: "product", entity_id: "FG-105", created_at: new Date("2026-04-14T05:00:00Z") },
  { action: "Created", entity: "order", entity_id: "PO-4036", created_at: new Date("2026-04-14T05:30:00Z") },
];

async function main() {
  await prisma.inventoryLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.manufacturing.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({ data: products });
  await prisma.customer.createMany({ data: customers });
  await prisma.supplier.createMany({ data: suppliers });

  for (const order of [...saleOrders, ...purchaseOrders]) {
    await prisma.order.create({ data: order });
  }

  await prisma.manufacturing.createMany({ data: manufacturingBatches });
  await prisma.inventoryLog.createMany({ data: inventoryLogs });
  await prisma.activityLog.createMany({ data: activityLogs });

  console.log("Electronics seed data inserted successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
