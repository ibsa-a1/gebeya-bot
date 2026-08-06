"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Package } from "lucide-react";
import { useTenant } from "../../../hooks/useTenant";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  Product,
} from "../../../hooks/useProducts";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

const emptyForm = { name: "", category: "", price: "", stock: "" };

export default function ProductsPage() {
  const { tenantId, currentTenant } = useTenant();
  const { data, isLoading } = useProducts(tenantId);
  const createProduct = useCreateProduct(tenantId);
  const updateProduct = useUpdateProduct(tenantId);
  const deleteProduct = useDeleteProduct(tenantId);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(p: Product) {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, price: p.price, stock: String(p.stock) });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      stock: Number(form.stock),
    };
    try {
      if (editingId) {
        await updateProduct.mutateAsync({ productId: editingId, data: payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch {
      setFormError("Couldn't save that product. Check the values and try again.");
    }
  }

  const saving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink/60">
            What buyers see in {currentTenant?.name ?? "your store"}
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus size={16} /> Add product
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 p-6">
          <p className="mb-4 text-sm font-medium text-ink/70">
            {editingId ? "Edit product" : "New product"}
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Category"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label="Price (ETB)"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Stock"
              type="number"
              min="0"
              required
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
            {formError && <p className="col-span-2 text-sm text-signal-red">{formError}</p>}
            <div className="col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? "Save changes" : "Save product"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-ink/40">Loading…</div>
      ) : data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3.5 text-ink/70">{p.category}</td>
                  <td className="px-5 py-3.5 font-mono text-ink">{p.price} ETB</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={p.stock > 0 ? "green" : "red"}>
                      {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEditForm(p)}
                        className="text-ink/40 hover:text-indigo"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct.mutate(p.id)}
                        className="text-ink/40 hover:text-signal-red"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Package size={28} className="text-ink/30" />
          <div>
            <p className="font-medium text-ink">No products yet</p>
            <p className="mt-1 text-sm text-ink/50">
              Add your first product to start selling through your bot.
            </p>
          </div>
          <div className="tilet-rule w-12" />
        </Card>
      )}
    </div>
  );
}
