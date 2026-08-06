"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../../../../hooks/useCart";
import { useMiniAppCheckout } from "../../../../hooks/useMiniApp";
import { useTelegramWebApp } from "../../../../hooks/useTelegramWebApp";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Input } from "../../../../components/ui/Input";

export default function CheckoutPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const { items, updateQuantity, removeItem, totalPrice, clear } = useCart();
  const checkout = useMiniAppCheckout(tenantId);
  const webApp = useTelegramWebApp();

  const isRealTelegramSession = !!webApp?.initDataUnsafe.user?.id;
  const [manualTestId, setManualTestId] = useState("");
  const [orderResult, setOrderResult] = useState<{ id: string; totalAmount: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    if (!isRealTelegramSession && !manualTestId) {
      setError("Enter a Telegram ID to test checkout with (auto-verified when opened from Telegram).");
      return;
    }
    try {
      const order = await checkout.mutateAsync(
        isRealTelegramSession
          ? { initData: webApp!.initData, items }
          : { devTestTelegramId: manualTestId, items },
      );
      setOrderResult(order);
      clear();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Checkout failed. Please try again.");
    }
  }

  if (orderResult) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-market-green/10 text-market-green">
          ✓
        </div>
        <h1 className="text-lg font-semibold text-ink">Order placed</h1>
        <p className="mt-1 text-sm text-ink/60">
          Order #{orderResult.id.slice(-8)} · {orderResult.totalAmount} ETB
        </p>
        <p className="mt-4 text-sm text-ink/50">
          Complete payment in your chat with the bot to confirm this order.
        </p>
        <Button className="mt-6" onClick={() => router.push(`/mini-app/${tenantId}`)}>
          Back to store
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to store
      </button>

      <h1 className="text-lg font-semibold text-ink">Your cart</h1>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/50">Your cart is empty.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <Card key={item.productId} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="font-mono text-xs text-ink/50">{item.price} ETB each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink/60 hover:bg-ink/5"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-5 text-center font-mono text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink/60 hover:bg-ink/5"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-ink/30 hover:text-signal-red"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-ink/60">Total</span>
            <span className="font-mono text-lg font-medium text-ink">
              {totalPrice.toLocaleString()} ETB
            </span>
          </div>

          {!isRealTelegramSession && (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-3">
              <p className="text-xs font-medium text-gold-dark">Test mode</p>
              <p className="mt-0.5 text-xs text-ink/60">
                Not opened from Telegram — enter a Telegram user ID to test checkout.
              </p>
              <Input
                className="mt-2"
                placeholder="e.g. 123456789"
                value={manualTestId}
                onChange={(e) => setManualTestId(e.target.value)}
              />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-signal-red">{error}</p>}

          <Button
            onClick={handleCheckout}
            loading={checkout.isPending}
            className="mt-5 w-full"
          >
            Place order
          </Button>
        </>
      )}
    </div>
  );
}
