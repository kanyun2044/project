export type ChatRole = "user" | "assistant" | "system";

export type ChatAttachment = {
  id?: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: "loading" | "done" | "error";
  attachments?: ChatAttachment[];
  metadata?: ChatMessageMetadata | null;
};

export type ChatMessageMetadata = {
  type?: "BOOKING_DRAFT" | "ORDER_PREVIEW" | "ORDER_CONFIRMED" | "ORDER_CANCELED" | string;
  orderId?: string;
  orderNo?: string;
  orderSnapshot?: {
    id: string;
    orderNo: string;
    type: "FLIGHT" | "HOTEL";
    status: string;
    totalAmount: number;
    bookingDetails: Record<string, unknown>;
  };
  orderItems?: Array<{
    orderId?: string;
    orderNo?: string;
    orderSnapshot?: {
      id: string;
      orderNo: string;
      type: "FLIGHT" | "HOTEL";
      status: string;
      totalAmount: number;
      bookingDetails: Record<string, unknown>;
    };
    booking?: {
      intent?: string;
      slots?: Record<string, unknown>;
      missingSlots?: string[];
      status?: string;
    };
  }>;
  booking?: {
    intent?: string;
    slots?: Record<string, unknown>;
    missingSlots?: string[];
    status?: string;
  };
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  isCustomTitle?: boolean;
};
