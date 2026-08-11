export type OrderType = "FLIGHT" | "HOTEL";

export type OrderStatus =
  | "PENDING_CONFIRM"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "COMPLETED";

export type Order = {
  id: string;
  userId: string;
  chatSessionId?: string | null;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  totalAmount: string;
  bookingDetails: Record<string, unknown>;
  paymentMethod?: string | null;
  paymentNo?: string | null;
  confirmedAt?: string | null;
  paidAt?: string | null;
  canceledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderListResponse = {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
};
