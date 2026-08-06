"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShoppingCart, Search } from "lucide-react";
import { useMiniAppProducts } from "../../../hooks/useMiniApp";
import { useCart } from "../../../hooks/useCart";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function StorefrontPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useMiniAppProducts(tenantId, search);
  const { items, addItem, totalItems, totalPrice } = useCart();

  return (
    <div className="mx-auto max-w-md pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-canvas/95 px-4 pt-5 pb-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-ink">Store</h1>
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        {isLoading ? (
          <div className="col-span-2 flex h-40 items-center justify-center text-ink/40">
            Loading…
          </div>
        ) : data && data.items.length > 0 ? (
          data.items.map((p) => {
            const inCart = items.find((i) => i.productId === p.id);
            return (
              <Card key={p.id} className="flex flex-col p-3">
                <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-ink/[0.04] text-xs text-ink/30">
                  No image
                </div>
                <p className="text-sm font-medium leading-tight text-ink">{p.name}</p>
                <p className="mt-1 font-mono text-sm text-ink/70">{p.price} ETB</p>
                <p className="text-xs text-ink/40">
                  {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                </p>
                <Button
                  variant={inCart ? "secondary" : "primary"}
                  disabled={p.stock === 0}
                  onClick={() => addItem({ productId: p.id, name: p.name, price: Number(p.price) })}
                  className="mt-2.5 w-full text-xs py-2"
                >
                  {inCart ? `In cart (${inCart.quantity})` : "Add to cart"}
                </Button>
              </Card>
            );
          })
        ) : (
          <p className="col-span-2 py-16 text-center text-sm text-ink/50">
            No products found.
          </p>
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-4 shadow-[0_-4px_12px_rgba(28,30,38,0.06)]">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <div className="text-sm text-ink/70">
              {totalItems} item{totalItems > 1 ? "s" : ""} · {totalPrice.toLocaleString()} ETB
            </div>
            <Button onClick={() => router.push(`/mini-app/${tenantId}/checkout`)}>
              <ShoppingCart size={16} /> Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
