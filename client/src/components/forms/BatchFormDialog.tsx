import { useEffect } from "react";
import { useFieldArray, useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
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
import type { BatchCreateInput, ProductDto } from "@/lib/api";

const materialSchema = z.object({
  product_code: z.string().min(1, "Product code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

const batchSchema = z.object({
  batch_number: z.string().min(1, "Batch number is required"),
  status: z.string().optional(),
  raw_materials: z.array(materialSchema).min(1, "Add at least one raw material"),
  output: z.array(materialSchema).min(1, "Add at least one output item"),
});

export type BatchFormValues = z.infer<typeof batchSchema>;
type BatchFormInput = z.input<typeof batchSchema>;

type BatchFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  defaultValues?: Partial<BatchFormValues>;
  submitting?: boolean;
  error?: string;
  products?: ProductDto[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BatchFormValues) => Promise<void> | void;
};

const emptyValues: BatchFormInput = {
  batch_number: "",
  status: "WIP",
  raw_materials: [{ product_code: "", quantity: 1 }],
  output: [{ product_code: "", quantity: 1 }],
};

export function toBatchPayload(values: BatchFormValues): BatchCreateInput {
  return {
    batch_number: values.batch_number,
    raw_materials: values.raw_materials,
    output: values.output,
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-rose-300">{message}</p> : null;
}

function MaterialsSection({
  title,
  description,
  name,
  fields,
  append,
  remove,
  register,
  errors,
  products,
}: {
  title: string;
  description: string;
  name: "raw_materials" | "output";
  fields: Array<{ id: string }>;
  append: (value: { product_code: string; quantity: number }) => void;
  remove: (index: number) => void;
  register: UseFormRegister<BatchFormInput>;
  errors: FieldErrors<BatchFormInput>;
  products: ProductDto[];
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{title}</h3>
          <p className="mt-1 text-sm text-[#969c88]">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ product_code: "", quantity: 1 })}
          className="rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-4 rounded-[22px] border border-white/8 bg-white/[0.02] p-4 md:grid-cols-[1.3fr_0.7fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={`${name}-product-${field.id}`}>
                Product code
              </label>
              <Input
                id={`${name}-product-${field.id}`}
                {...register(`${name}.${index}.product_code`)}
                list={`${name}-product-options-${field.id}`}
                placeholder="Enter product code"
                className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
              />
              <datalist id={`${name}-product-options-${field.id}`}>
                {products.map((product) => (
                  <option key={product.product_code} value={product.product_code} />
                ))}
              </datalist>
              <FieldError message={errors[name]?.[index]?.product_code?.message} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor={`${name}-quantity-${field.id}`}>
                Quantity
              </label>
              <Input
                id={`${name}-quantity-${field.id}`}
                type="number"
                {...register(`${name}.${index}.quantity`)}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white"
              />
              <FieldError message={errors[name]?.[index]?.quantity?.message} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                className="h-11 w-full rounded-2xl text-rose-200 hover:bg-rose-300/10 hover:text-rose-100"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <FieldError message={errors[name]?.message as string | undefined} />
    </div>
  );
}

export default function BatchFormDialog({
  open,
  mode,
  defaultValues,
  submitting = false,
  error,
  products = [],
  onOpenChange,
  onSubmit,
}: BatchFormDialogProps) {
  const form = useForm<BatchFormInput, unknown, BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: emptyValues,
  });

  const rawMaterials = useFieldArray<BatchFormInput>({ control: form.control, name: "raw_materials" });
  const outputs = useFieldArray<BatchFormInput>({ control: form.control, name: "output" });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      ...emptyValues,
      ...defaultValues,
      raw_materials: defaultValues?.raw_materials?.length ? defaultValues.raw_materials : emptyValues.raw_materials,
      output: defaultValues?.output?.length ? defaultValues.output : emptyValues.output,
    });
  }, [defaultValues, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
            {mode === "create" ? "Create manufacturing batch" : "Edit manufacturing batch"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
            Define raw materials and output items using a validated manufacturing form.
          </DialogDescription>
        </DialogHeader>

        <form
          className="min-h-0 overflow-y-auto px-6 pb-6"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="batch_number">
                Batch number
              </label>
              <Input
                id="batch_number"
                disabled={mode === "edit"}
                {...form.register("batch_number")}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white disabled:opacity-60"
              />
              <FieldError message={form.formState.errors.batch_number?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cfd3c0]" htmlFor="status">
                Status
              </label>
              <Input id="status" {...form.register("status")} className="h-11 rounded-2xl border-white/10 bg-white/[0.03] text-white" />
              <FieldError message={form.formState.errors.status?.message} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <MaterialsSection
              title="Raw materials"
              description="Track the product codes and quantities consumed by this batch."
              name="raw_materials"
              fields={rawMaterials.fields}
              append={rawMaterials.append}
              remove={rawMaterials.remove}
              register={form.register}
              errors={form.formState.errors}
              products={products}
            />
            <MaterialsSection
              title="Output items"
              description="Track what the batch is expected to produce."
              name="output"
              fields={outputs.fields}
              append={outputs.append}
              remove={outputs.remove}
              register={form.register}
              errors={form.formState.errors}
              products={products}
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <DialogFooter className="mt-6 rounded-[24px] border-t border-white/8 bg-white/[0.02]">
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]">
              {submitting ? "Saving..." : mode === "create" ? "Create batch" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
