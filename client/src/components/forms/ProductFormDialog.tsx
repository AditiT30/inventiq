import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
import type { ProductCreateInput } from "@/lib/api";

const productSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  weight: z.coerce.number().min(0, "Weight must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
type ProductFormInput = z.input<typeof productSchema>;

type ProductFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  defaultValues?: Partial<ProductFormValues>;
  submitting?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
};

const emptyValues: ProductFormInput = {
  product_code: "",
  name: "",
  description: "",
  weight: 0,
  price: 0,
  quantity: 0,
};

export function toProductCreateInput(values: ProductFormValues): ProductCreateInput {
  return {
    product_code: values.product_code,
    name: values.name,
    description: values.description?.trim() ? values.description.trim() : null,
    weight: values.weight,
    price: values.price,
    quantity: values.quantity,
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-rose-300">{message}</p> : null;
}

export default function ProductFormDialog({
  open,
  mode,
  defaultValues,
  submitting = false,
  error,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      ...emptyValues,
      ...defaultValues,
    });
  }, [defaultValues, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
            {mode === "create" ? "Create product" : "Edit product"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
            Capture the SKU, quantity, pricing, and notes using a validated product form.
          </DialogDescription>
        </DialogHeader>

        <form
          className="px-6 pb-6"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="product_code">
                Product code
              </label>
              <Input
                id="product_code"
                disabled={mode === "edit"}
                {...form.register("product_code")}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white disabled:opacity-60"
              />
              <FieldError message={form.formState.errors.product_code?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="name">
                Name
              </label>
              <Input id="name" {...form.register("name")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                {...form.register("description")}
                className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#666b59] focus:border-[#d6ff2e]/20"
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="weight">
                Weight
              </label>
              <Input id="weight" type="number" step="0.01" {...form.register("weight")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.weight?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="price">
                Price
              </label>
              <Input id="price" type="number" step="0.01" {...form.register("price")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.price?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="quantity">
                Quantity
              </label>
              <Input id="quantity" type="number" {...form.register("quantity")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.quantity?.message} />
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <DialogFooter className="mt-6 rounded-[24px] border-t border-white/8 bg-white/[0.02]">
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]">
              {submitting ? "Saving..." : mode === "create" ? "Create product" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
