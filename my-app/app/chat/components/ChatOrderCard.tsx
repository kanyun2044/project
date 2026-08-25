"use client";

import * as React from "react";
import { Box, Button, Card, CardActions, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ChatOrderSnapshot } from "../types";

type Props = {
  order: ChatOrderSnapshot;
  onConfirm: () => void;
  onModify: () => void;
  onCancel: () => void;
  onPay: () => void;
  onComplete: () => void;
};

const statusLabels: Record<string, string> = {
  PENDING_CONFIRM: "Pending confirmation",
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
};

const typeLabels: Record<string, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
};

const detailLabels: Record<string, string> = {
  from: "From",
  to: "To",
  date: "Date",
  passenger: "Passengers",
  city: "City",
  checkIn: "Check in",
  checkOut: "Check out",
  guests: "Guests",
  hotelName: "Hotel",
  roomType: "Room",
};

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Missing";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getStatusText(status: string) {
  if (status === "PENDING_PAYMENT") return "Order confirmed. Please continue from the order detail page or use the payment action.";
  if (status === "PAID") return "Payment received. The order can now be completed.";
  if (status === "CANCELED") return "This order has been canceled.";
  if (status === "COMPLETED") return "This order has been completed.";
  return "";
}

export default function ChatOrderCard({
  order,
  onConfirm,
  onModify,
  onCancel,
  onPay,
  onComplete,
}: Props) {
  const router = useRouter();
  const hasOrderPrice = Number(order.totalAmount ?? 0) > 0;
  const statusText = getStatusText(order.status);
  const isCanceled = order.status === "CANCELED";
  const canConfirmOrder = order.status === "PENDING_CONFIRM" && hasOrderPrice;
  const canCancelOrder = ["PENDING_CONFIRM", "PENDING_PAYMENT", "PAID"].includes(order.status);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        bgcolor: isCanceled ? "#f5f5f5" : "#fff",
        opacity: isCanceled ? 0.72 : 1,
      }}
    >
      <CardContent sx={{ pb: 1.25 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography fontWeight={700} fontSize={14}>
              {order.orderNo}
            </Typography>
            <Typography color="text.secondary" fontSize={13}>
              {typeLabels[order.type] ?? order.type} -{" "}
              {hasOrderPrice
                ? `$${Number(order.totalAmount).toFixed(2)}`
                : "Price pending"}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={statusLabels[order.status] ?? order.status}
          />
        </Stack>

        {order.bookingDetails && (
          <Box sx={{ display: "grid", gap: 0.5, mt: 1.25 }}>
            {Object.entries(order.bookingDetails)
              .filter(([key]) => key !== "totalAmount")
              .map(([key, value]) => (
                <Stack
                  key={key}
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography color="text.secondary" fontSize={12}>
                    {detailLabels[key] ?? key}
                  </Typography>
                  <Typography fontSize={12} fontWeight={500}>
                    {formatDetailValue(value)}
                  </Typography>
                </Stack>
              ))}
          </Box>
        )}

        {statusText && (
          <>
            <Divider sx={{ my: 1.25 }} />
            <Typography color="text.secondary" fontSize={12}>
              {statusText}
            </Typography>
          </>
        )}

        {!hasOrderPrice && order.status === "PENDING_CONFIRM" && (
          <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>
            Add a price before confirming.
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "flex-end", flexWrap: "wrap", px: 2, pb: 1.5 }}>
        <Button size="small" onClick={() => router.push(`/orders/${order.id}`)}>
          View details
        </Button>

        {order.status === "PENDING_CONFIRM" && (
          <Button size="small" onClick={onModify}>
            Modify information
          </Button>
        )}

        {canCancelOrder && (
          <Button size="small" color="error" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {order.status === "PENDING_CONFIRM" && (
          <Button
            size="small"
            variant="contained"
            disabled={!canConfirmOrder}
            onClick={onConfirm}
          >
            Confirm order
          </Button>
        )}

        {order.status === "PENDING_PAYMENT" && (
          <Button size="small" variant="contained" onClick={onPay}>
            Pay
          </Button>
        )}

        {order.status === "PAID" && (
          <Button size="small" variant="contained" color="success" onClick={onComplete}>
            Complete
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
