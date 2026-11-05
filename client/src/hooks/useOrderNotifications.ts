import { useEffect, useRef, useCallback, useState } from "react";
import { getMyActiveOrders, type OrderResponse } from "../api/orders";
import type { ToastMessage } from "../components/Toast";

const POLL_INTERVAL = 10_000;

export default function useOrderNotifications(loggedIn: boolean) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prevStatuses = useRef<Map<number, string>>(new Map());
  const polling = useRef<ReturnType<typeof setInterval>>();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      prevStatuses.current.clear();
      setToasts([]);
      return;
    }

    async function check() {
      try {
        const orders: OrderResponse[] = await getMyActiveOrders();
        const prev = prevStatuses.current;
        const next = new Map<number, string>();

        for (const order of orders) {
          const oldStatus = prev.get(order.id);
          next.set(order.id, order.status);

          if (oldStatus && oldStatus !== order.status && order.status === "Ready") {
            const itemNames = order.items.map((i) => i.name).join(", ");
            setToasts((t) => [
              ...t,
              {
                id: `ready-${order.id}-${Date.now()}`,
                text: `Order #${order.id} is ready for pickup! (${itemNames})`,
              },
            ]);
          }
        }

        prevStatuses.current = next;
      } catch {
        // silently ignore polling errors
      }
    }

    check();
    polling.current = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(polling.current);
  }, [loggedIn]);

  return { toasts, dismiss };
}
