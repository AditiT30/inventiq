import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CirclePlus,
  Edit3,
  MapPin,
  Package2,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Truck,
} from "lucide-react";

import { createProduct, deleteProduct, formatCurrency, getProducts, subscribeToLiveEvents, updateProduct, type ProductDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ProductFormDialog, { toProductCreateInput, type ProductFormValues } from "@/components/forms/ProductFormDialog";
import { ModulePage } from "@/components/common/module-shell";
import ProductAssistant from "@/components/common/ProductAssistant";


//specifying types
type ProductStatus = "Healthy" | "Low Stock" | "Critical";
type SortKey = "name" | "sku" | "stock" | "updated";
type Tone = "emerald" | "amber" | "rose";

type ProductRecord = {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  stock: number;
  weight: number;
  price: number;
  reorderPoint: number;
  unitPrice: string;
  warehouse: string;
  supplier: string;
  status: ProductStatus;
  updated: string;
  movement: string;
  reserved: number;
  available: number;
  notes: string;
};

const statusTone: Record<ProductStatus, Tone> = {
  Healthy: "emerald",
  "Low Stock": "amber",
  Critical: "rose",
};

const toneClasses: Record<Tone, string> = {
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
};

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "sku", label: "SKU" },
  { key: "stock", label: "Stock" },
  { key: "updated", label: "Updated" },
];

//GET PRODUCT STATUS - healthy , low stock , critical
const getProductStatus = (quantity: number): ProductStatus => {
  if (quantity <= 25) {
    return "Critical";
  }

  if (quantity <= 75) {
    return "Low Stock";
  }

  return "Healthy";
};

//Get Product category (from description)
const getCategory = (description: string | null) => {
  if (!description) {
    return "General";
  }

  const firstWord = description.split(" ")[0];
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
};

//Map Product
const mapProduct = (product: ProductDto): ProductRecord => {
  const status = getProductStatus(product.quantity);
  const reorderPoint = Math.max(10, Math.ceil(product.quantity * 0.65));
  const reserved = Math.max(0, Math.min(Math.floor(product.quantity * 0.15), product.quantity));

  return {
    id: product.product_code,
    name: product.name,
    description: product.description ?? "",
    sku: product.product_code,
    category: getCategory(product.description),
    stock: product.quantity,
    weight: product.weight,
    price: product.price,
    reorderPoint,
    unitPrice: formatCurrency(product.price),
    warehouse: `Zone ${product.product_code.slice(-1)} / Rack ${product.product_code.slice(-3)}`,
    supplier: `Preferred vendor for ${product.product_code}`,
    status,
    updated: new Date(product.last_updated).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    movement: status === "Healthy" ? "Steady movement" : status === "Low Stock" ? "Needs attention" : "Immediate action",
    reserved,
    available: Math.max(product.quantity - reserved, 0),
    notes: product.description ?? "No product notes available yet.",
  };
};



function CurrencyBadge({ label }: { label: string }) {
  return <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-slate-200">{label}</Badge>;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const tone = statusTone[status];

  return <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>{status}</Badge>;
}

function ProductStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="ops-telemetry px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#6d725d]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[#989d89]">{helper}</p>
    </div>
  );
}

function ProductListItem({
  product,
  isSelected,
  onSelect,
}: {
  product: ProductRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="ops-queue-card w-full p-5 text-left"
      data-active={isSelected}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold tracking-[-0.02em] text-white">{product.name}</div>
          <div className="mt-1 text-sm text-[#8f947f]">
            {product.sku} • {product.category}
          </div>
        </div>
        <StatusBadge status={product.status} />
      </div>

      <div className="mt-5 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
        <div>
          <div className="text-[#6f745d]">Stock</div>
          <div className="mt-1 font-medium text-white">{product.stock} units</div>
        </div>
        <div>
          <div className="text-[#6f745d]">Available</div>
          <div className="mt-1 font-medium text-white">{product.available} units</div>
        </div>
        <div>
          <div className="text-[#6f745d]">Updated</div>
          <div className="mt-1 font-medium text-white">{product.updated}</div>
        </div>
      </div>
    </button>
  );
}

function SortTabs({
  activeKey,
  onChange,
}: {
  activeKey: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {sortOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
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

function ProductDetail({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductRecord;
  onEdit: (product: ProductRecord) => void;
  onDelete: (product: ProductRecord) => void;
}) {
  return (
    <Card className="ops-panel rounded-[32px] py-0">
      <CardHeader className="px-8 pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-3xl font-semibold tracking-[-0.05em] text-white">{product.name}</CardTitle>
              <StatusBadge status={product.status} />
            </div>
            <p className="mt-3 text-sm text-[#8d927e]">
              {product.id} • {product.sku} • {product.category}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onEdit(product)} className="rounded-full bg-amber-300 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-200">
              <Edit3 className="size-4" />
              Edit
            </Button>
            <Button
              onClick={() => onDelete(product)}
              variant="ghost"
              className="rounded-full text-rose-200 hover:bg-rose-300/10 hover:text-rose-100"
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 px-8 pb-8">
        <div className="grid gap-5 md:grid-cols-3">
          <ProductStat label="Current stock" value={`${product.stock}`} helper={`${product.movement} demand profile`} />
          <ProductStat label="Reserved" value={`${product.reserved}`} helper="Committed to pending orders and batches" />
          <ProductStat label="Available" value={`${product.available}`} helper={`Reorder point: ${product.reorderPoint} units`} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
          <div className="ops-telemetry rounded-[28px] p-6">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Inventory context</h3>
            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Package2 className="mt-0.5 size-4 text-amber-200" />
                <div>
                  <div className="font-medium text-white">Unit price</div>
                  <div className="mt-1">{product.unitPrice}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-amber-200" />
                <div>
                  <div className="font-medium text-white">Warehouse location</div>
                  <div className="mt-1">{product.warehouse}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 size-4 text-amber-200" />
                <div>
                  <div className="font-medium text-white">Preferred supplier</div>
                  <div className="mt-1">{product.supplier}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 size-4 text-amber-200" />
                <div>
                  <div className="font-medium text-white">Latest update</div>
                  <div className="mt-1">{product.updated}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ops-telemetry rounded-[28px] p-6">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">Operational notes</h3>
            <p className="mt-5 text-sm leading-8 text-[#a0a591]">{product.notes}</p>

            <Separator className="my-5 bg-white/8" />

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                <span className="text-sm text-[#909581]">Stock health</span>
                <StatusBadge status={product.status} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                <span className="text-sm text-[#909581]">Audit readiness</span>
                <CurrencyBadge label="Verified" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                <span className="text-sm text-[#909581]">Safety level</span>
                <CurrencyBadge label={`${product.reorderPoint} min units`} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Products() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState<"create" | "edit">("create");
  const [productDialogError, setProductDialogError] = useState("");
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const loadProducts = async (isActive = true) => {
    try {
      setLoading(true);
      setError("");
      const response = await getProducts();

      if (!isActive) {
        return;
      }

      const mappedProducts = response.map(mapProduct);
      setProducts(mappedProducts);
      setSelectedProductId((current) => {
        const nextSelected = current || mappedProducts[0]?.id || "";
        return mappedProducts.some((product) => product.id === nextSelected) ? nextSelected : mappedProducts[0]?.id || "";
      });
    } catch (fetchError) {
      if (isActive) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load products");
      }
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  };

  // Product mutations from any tab/session trigger the same loader path already used on first render.
  useEffect(() => {
    return subscribeToLiveEvents(["products"], () => {
      setLiveTick((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;

    void loadProducts(active);

    return () => {
      active = false;
    };
  }, [liveTick]);

  const handleEditProduct = async (product: ProductRecord) => {
    setSelectedProductId(product.id);
    setProductDialogMode("edit");
    setProductDialogError("");
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (product: ProductRecord) => {
    setDeleteError("");
    setProductToDelete(product);
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const visibleProducts = products.filter((product) => {
      if (!query) {
        return true;
      }

      return [product.name, product.sku, product.category, product.supplier].some((field) =>
        field.toLowerCase().includes(query)
      );
    });

    return [...visibleProducts].sort((left, right) => {
      if (sortKey === "stock") {
        return right.stock - left.stock;
      }

      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [products, searchQuery, sortKey]);

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedProductId) ?? filteredProducts[0];

  const visibleProducts = showAllProducts ? filteredProducts : filteredProducts.slice(0, 5);
  const hasMoreProducts = filteredProducts.length > 5;

  const lowStockCount = products.filter((product) => product.status !== "Healthy").length;
  const criticalCount = products.filter((product) => product.status === "Critical").length;
  const selectedProductForDialog = products.find((product) => product.id === selectedProductId);

  useEffect(() => {
    setShowAllProducts(false);
  }, [searchQuery, sortKey]);

  const handleSubmitProduct = async (values: ProductFormValues) => {
    try {
      setProductSubmitting(true);
      setProductDialogError("");

      if (productDialogMode === "create") {
        const createdProduct = await createProduct(toProductCreateInput(values));
        setSelectedProductId(createdProduct.product_code);
      } else if (selectedProductForDialog) {
        const updatedProduct = await updateProduct(selectedProductForDialog.id, {
          name: values.name,
          description: values.description?.trim() ? values.description.trim() : null,
          weight: values.weight,
          price: values.price,
          quantity: values.quantity,
        });
        setSelectedProductId(updatedProduct.product_code);
      }

      setProductDialogOpen(false);
      await loadProducts();
    } catch (mutationError) {
      setProductDialogError(mutationError instanceof Error ? mutationError.message : "Failed to save product");
    } finally {
      setProductSubmitting(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) {
      return;
    }

    try {
      setDeleteSubmitting(true);
      setDeleteError("");
      await deleteProduct(productToDelete.id);

      setProducts((currentProducts) => {
        const remainingProducts = currentProducts.filter((product) => product.id !== productToDelete.id);
        const nextSelectedProduct = remainingProducts[0];
        setSelectedProductId((currentSelected) =>
          currentSelected === productToDelete.id ? nextSelectedProduct?.id ?? "" : currentSelected
        );
        return remainingProducts;
      });

      setProductToDelete(null);
      await loadProducts();
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Failed to delete product";
      setDeleteError(message);
      setError(message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <ModulePage>
      <section className="ops-board p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-[#d6ff2e]">
                <ShieldCheck className="size-3.5" />
                Product control center
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">Manage products with a faster list-detail workflow.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#a0a591] sm:text-lg">
                Search quickly, sort intelligently, and inspect the selected product without losing your place in the list.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ProductStat label="Tracked SKUs" value={String(products.length)} helper="Across active categories" />
              <ProductStat label="Low stock" value={String(lowStockCount)} helper="Need reorder review" />
              <ProductStat label="Critical" value={String(criticalCount)} helper="Require immediate action" />
            </div>
          </div>

          <div className="mt-8 flex justify-start">
            <Button
              type="button"
              onClick={() => {
                setProductDialogMode("create");
                setProductDialogError("");
                setProductDialogOpen(true);
              }}
              className="rounded-full bg-[#d6ff2e] px-6 text-sm font-semibold text-[#171711] hover:bg-[#e5ff70]"
            >
              <CirclePlus className="size-4" />
              Add product
            </Button>
          </div>
      </section>

      <section className="grid gap-7 xl:items-start xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="ops-panel rounded-[32px] py-0">
            <CardHeader className="space-y-6 px-8 pt-8">
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">Products</CardTitle>
                  <p className="mt-3 text-sm leading-7 text-[#969b88]">Use search and sort controls to jump straight to the right item.</p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name, SKU, category, or supplier"
                    className="h-12 rounded-full border-white/10 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-[#656a58]"
                  />
                </div>

                <SortTabs activeKey={sortKey} onChange={setSortKey} />
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              {loading ? <div className="text-sm text-slate-400">Loading products...</div> : null}
              {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

              {!loading && !error && filteredProducts.length > 0 ? (
                <>
                  <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
                    {visibleProducts.map((product) => (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        isSelected={selectedProduct?.id === product.id}
                        onSelect={() => setSelectedProductId(product.id)}
                      />
                    ))}
                  </div>

                  {hasMoreProducts ? (
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAllProducts((current) => !current)}
                        className="rounded-full border-white/10 bg-white/[0.03] px-5 text-sm font-medium text-white hover:bg-white/[0.06]"
                      >
                        {showAllProducts ? "Show less" : `See more (${filteredProducts.length - 5} more)`}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {!loading && !error && filteredProducts.length === 0 && (
                <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] px-5 py-10 text-center text-sm text-slate-400">
                  No products matched that search. Try a different SKU, supplier, or category.
                </div>
              )}
            </CardContent>
          </Card>

      <div className="space-y-7">
        {selectedProduct ? (
          <ProductDetail product={selectedProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
        ) : (
          <Card className="ops-panel py-0">
            <CardContent className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-slate-400">
              {loading ? "Loading product details..." : "Select a product from the left panel to view its details."}
            </CardContent>
          </Card>
        )}

        <ProductAssistant selectedProductCode={selectedProduct?.id} />
      </div>
      </section>

      <ProductFormDialog
        open={productDialogOpen}
        mode={productDialogMode}
        defaultValues={
          productDialogMode === "edit" && selectedProductForDialog
            ? {
                product_code: selectedProductForDialog.id,
                name: selectedProductForDialog.name,
                description: selectedProductForDialog.description,
                weight: selectedProductForDialog.weight,
                price: selectedProductForDialog.price,
                quantity: selectedProductForDialog.stock,
              }
            : undefined
        }
        submitting={productSubmitting}
        error={productDialogError}
        onOpenChange={setProductDialogOpen}
        onSubmit={handleSubmitProduct}
      />

      <Dialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setProductToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[28px] border border-white/10 bg-black p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Remove product
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-[#9ca18e]">
              {productToDelete
                ? `Delete ${productToDelete.name} (${productToDelete.sku}) from the inventory catalog. This cannot be undone.`
                : "Delete this product from the inventory catalog."}
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
                  setProductToDelete(null);
                  setDeleteError("");
                }}
                className="rounded-full text-[#b8bea4] hover:bg-white/[0.04] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmDeleteProduct()}
                disabled={deleteSubmitting}
                className="rounded-full bg-rose-400 px-6 text-sm font-semibold text-[#1b140f] hover:bg-rose-300"
              >
                {deleteSubmitting ? "Removing..." : "Delete product"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

export default Products;
