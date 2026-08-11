import { OrderStatus, OrderType } from "./types";

export const statusLabels: Record<OrderStatus, string> = {
  PENDING_CONFIRM: "Pending confirm",
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
};

export const typeLabels: Record<OrderType, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
};

export function getStatusColor(status: OrderStatus) {
  if (status === "PENDING_CONFIRM") return "warning";
  if (status === "PENDING_PAYMENT") return "info";
  if (status === "PAID") return "success";
  if (status === "CANCELED") return "default";
  return "primary";
}
