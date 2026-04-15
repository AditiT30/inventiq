import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

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
import type { CustomerDto, OrderCreateInput, ProductDto, SupplierDto } from "@/lib/api";

const lineItemSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.coerce.number().min(0, "Unit price must be non-negative"),
});

const orderSchema = z.object({
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  customer_id: z.string().optional(),
  supplier_id: z.string().optional(),
  products: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
type OrderFormInput = z.input<typeof orderSchema>;

type OrderFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  orderType: "sale" | "purchase";
  title: string;
  description: string;
  customers?: CustomerDto[];
  products?: ProductDto[];
  suppliers?: SupplierDto[];
  defaultValues?: Partial<OrderFormValues>;
  submitting?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrderFormValues) => Promise<void> | void;
};

const emptyValues: OrderFormInput = {
  status: "",
  notes: "",
  customer_id: "",
  supplier_id: "",
  products: [{ product_code: "", quantity: 1, unit_price: 0 }],
};

export function toOrderPayload(orderType: "sale" | "purchase", values: OrderFormValues): OrderCreateInput {
  return {
    type: orderType,
    status: values.status,
    notes: values.notes?.trim() ? values.notes.trim() : null,
    customer_id: orderType === "sale" ? values.customer_id || null : null,
    supplier_id: orderType === "purchase" ? values.supplier_id || null : null,
    products: values.products.map((line) => ({
      product_code: line.product_code,
      quantity: line.quantity,
      unit_price: line.unit_price,
    })),
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-rose-300">{message}</p> : null;
}

export default function OrderFormDialog({
  open,
  mode,
  orderType,
  title,
  description,
  customers = [],
  products = [],
  suppliers = [],
  defaultValues,
  submitting = false,
  error,
  onOpenChange,
  onSubmit,
}: OrderFormDialogProps) {
  const form = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: emptyValues,
  });

  const lineItems = useFieldArray<OrderFormInput>({
    control: form.control,
    name: "products",
  });
  const watchedCustomerId = form.watch("customer_id");
  const watchedSupplierId = form.watch("supplier_id");
  const watchedProducts = form.watch("products");
  const matchedCustomer = customers.find((customer) => customer.customer_id === watchedCustomerId);
  const matchedSupplier = suppliers.find((supplier) => supplier.supplier_id === watchedSupplierId);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      ...emptyValues,
      status: orderType === "sale" ? "Quotation" : "Quotations Received",
      ...defaultValues,
      products: defaultValues?.products?.length ? defaultValues.products : emptyValues.products,
    });
  }, [defaultValues, form, open, orderType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-7 text-[#9ca18e]">{description}</DialogDescription>
        </DialogHeader>

        <form
          className="min-h-0 overflow-y-auto px-6 pb-6"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="status">
                Status
              </label>
                <Input id="status" {...form.register("status")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.status?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={orderType === "sale" ? "customer_id" : "supplier_id"}>
                {orderType === "sale" ? "Customer ID" : "Supplier ID"}
              </label>
              {orderType === "sale" ? (
                <>
                <Input
                  id="customer_id"
                  {...form.register("customer_id")}
                  list="customer-id-options"
                  placeholder="Enter customer ID"
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
                />
                <datalist id="customer-id-options">
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id} />
                  ))}
                </datalist>
                {matchedCustomer ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-[#c6ccb2]">
                    <div className="font-medium text-white">{matchedCustomer.name}</div>
                    <div>{matchedCustomer.contact}</div>
                    <div>{matchedCustomer.address}</div>
                  </div>
                ) : watchedCustomerId ? (
                  <p className="text-xs text-amber-200">No customer found for that ID yet.</p>
                ) : null}
                </>
              ) : (
                <>
                <Input
                  id="supplier_id"
                  {...form.register("supplier_id")}
                  list="supplier-id-options"
                  placeholder="Enter supplier ID"
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
                />
                <datalist id="supplier-id-options">
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id} />
                  ))}
                </datalist>
                {matchedSupplier ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-[#c6ccb2]">
                    <div className="font-medium text-white">{matchedSupplier.name}</div>
                    <div>{matchedSupplier.contact}</div>
                    <div>{matchedSupplier.address}</div>
                  </div>
                ) : watchedSupplierId ? (
                  <p className="text-xs text-amber-200">No supplier found for that ID yet.</p>
                ) : null}
                </>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                {...form.register("notes")}
                className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#666b59] focus:border-[#d6ff2e]/20"
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>
          </div>

          <div className="mt-6 rounded-[24px]  border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">Line items</h3>
                <p className="mt-1 text-sm text-[#969c88]">Add one or more products with quantity and unit price.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => lineItems.append({ product_code: "", quantity: 1, unit_price: 0 })}
                className="rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              >
                <Plus className="size-4" />
                Add line
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {lineItems.fields.map((field, index) => (
                <div key={field.id} className="grid  gap-4 rounded-[22px] border border-white/8 bg-white/[0.02] p-4 md:grid-cols-[1.35fr_0.7fr_0.7fr_auto]">

                  {/*Product code i/p box*/}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={`product_code-${field.id}`}>
                      P_Code
                    </label>
                    <Input
                      id={`product_code-${field.id}`}
                      {...form.register(`products.${index}.product_code`)}
                      list={`product-code-options-${field.id}`}
                      placeholder="Enter product code"
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
                    />
                    <datalist id={`product-code-options-${field.id}`}>
                      {products.map((product) => (
                        <option key={product.product_code} value={product.product_code} />
                      ))}
                    </datalist>
                    {(() => {
                      const matchedProduct = products.find((product) => product.product_code === watchedProducts?.[index]?.product_code);
                      return matchedProduct ? (
                        <p className="text-xs text-[#aab090]">
                          {matchedProduct.name} • {matchedProduct.quantity} in stock • Rs {matchedProduct.price.toFixed(2)}
                        </p>
                      ) : watchedProducts?.[index]?.product_code ? (
                        <p className="text-xs text-amber-200">No product found for that code yet.</p>
                      ) : null;
                    })()}
                    <FieldError message={form.formState.errors.products?.[index]?.product_code?.message} />
                  </div>

                  {/*Product Quantity I/p box*/}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={`quantity-${field.id}`}>
                      Quantity
                    </label>
                    <Input
                      id={`quantity-${field.id}`}
                      type="number"
                      {...form.register(`products.${index}.quantity`)}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
                    />
                    <FieldError message={form.formState.errors.products?.[index]?.quantity?.message} />
                  </div>

                  {/*Unit Price I/p Box*/}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={`unit_price-${field.id}`}>
                      Price
                    </label>
                    <Input
                      id={`unit_price-${field.id}`}
                      type="number"
                      step="0.01"
                      {...form.register(`products.${index}.unit_price`)}
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
                    />
                    <FieldError message={form.formState.errors.products?.[index]?.unit_price?.message} />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={lineItems.fields.length === 1}
                      onClick={() => lineItems.remove(index)}
                      className="h-11 w-full rounded-2xl text-rose-200 hover:bg-rose-300/10 hover:text-rose-100"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <FieldError message={form.formState.errors.products?.message} />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <DialogFooter className="mt-6 rounded-[24px] border-t border-white/8 bg-white/[0.02]">
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]">
              {submitting ? "Saving..." : mode === "create" ? "Create order" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
