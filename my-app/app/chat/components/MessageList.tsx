"use client";

import * as React from "react";
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "../store/ChatContext";

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

const hiddenOrderStatusTypes = [
  "ORDER_CONFIRMED",
  "ORDER_PAID",
  "ORDER_CANCELED",
  "ORDER_COMPLETED",
];

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Missing";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getOrderItems(metadata: any) {
  if (Array.isArray(metadata?.orderItems) && metadata.orderItems.length > 0) {
    return metadata.orderItems;
  }

  if (metadata?.orderSnapshot) {
    return [
      {
        orderId: metadata.orderId,
        orderNo: metadata.orderNo,
        orderSnapshot: metadata.orderSnapshot,
      },
    ];
  }

  return [];
}

export default function MessageList() {
  const {
    activeSession,
    retryMessage,
    confirmOrder,
    payOrder,
    completeOrder,
    cancelOrder,
  } = useChat();
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  if (!activeSession || activeSession.messages.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          color: "text.secondary",
        }}
      >
        <Typography>Start a new chat</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
      <Box sx={{ maxWidth: 840, mx: "auto" }}>
        {activeSession.messages.map((message) => {
          const isUser = message.role === "user";
          const orderItems = getOrderItems(message.metadata);
          const metadataType = message.metadata?.type ?? "";
          const shouldHideStatusMessage =
            !isUser && hiddenOrderStatusTypes.includes(metadataType);
          const shouldRenderOrderCards =
            !isUser &&
            orderItems.length > 0 &&
            (metadataType === "ORDER_PREVIEW" || metadataType === "BOOKING_BATCH");

          if (shouldHideStatusMessage) {
            return null;
          }

          return (
            <Box
              key={message.id}
              sx={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                gap: 1.5,
                mb: 2.5,
              }}
            >
              {!isUser && (
                <Avatar sx={{ bgcolor: "#111827", width: 32, height: 32 }}>
                  <SmartToyOutlinedIcon fontSize="small" />
                </Avatar>
              )}

              <Box
                sx={{
                  maxWidth: "78%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: 3,
                    bgcolor: isUser ? "primary.main" : "#f2f3f5",
                    color: isUser ? "primary.contrastText" : "text.primary",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {isUser ? (
                    <Typography fontSize={15} lineHeight={1.8}>
                      {message.content || "Thinking..."}
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        fontSize: 15,
                        lineHeight: 1.8,
                        "& p": {
                          my: 0,
                        },
                        "& ul, & ol": {
                          pl: 3,
                          my: 1,
                        },
                        "& pre": {
                          bgcolor: "#111827",
                          color: "#f9fafb",
                          p: 1.5,
                          borderRadius: 2,
                          overflowX: "auto",
                        },
                        "& code": {
                          fontFamily: "monospace",
                          fontSize: 14,
                        },
                        "& a": {
                          color: "primary.main",
                        },
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content || "Thinking..."}
                    </ReactMarkdown>
                  </Box>
                )}

                  {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ display: "grid", gap: 1, mt: message.content ? 1 : 0 }}>
                      {message.attachments.map((attachment) => {
                        const fileHref = `${apiUrl}${attachment.fileUrl}`;
                        const isImage = attachment.mimeType.startsWith("image/");

                        return isImage ? (
                          <Box
                            key={attachment.id ?? attachment.fileUrl}
                            component="img"
                            src={fileHref}
                            alt={attachment.fileName}
                            sx={{
                              maxWidth: 240,
                              maxHeight: 180,
                              borderRadius: 2,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Box
                            key={attachment.id ?? attachment.fileUrl}
                            component="a"
                            href={fileHref}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                              color: "inherit",
                              textDecoration: "underline",
                              fontSize: 14,
                            }}
                          >
                            {attachment.fileName}
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {shouldRenderOrderCards && (
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      {orderItems.map((item: any, index: number) => {
                        const orderId = item.orderId ?? item.orderSnapshot?.id;
                        const latestOrderSnapshot = orderId
                          ? activeSession.messages
                              .flatMap((chatMessage) => getOrderItems(chatMessage.metadata))
                              .filter(
                                (orderItem: any) =>
                                  (orderItem.orderId ?? orderItem.orderSnapshot?.id) === orderId,
                              )
                              .map((orderItem: any) => orderItem.orderSnapshot)
                              .filter(Boolean)
                              .at(-1)
                          : null;
                        const order = latestOrderSnapshot ?? item.orderSnapshot;

                        if (!order) return null;

                        const hasOrderPrice = Number(order.totalAmount ?? 0) > 0;
                        const canConfirmOrder =
                          orderId && order.status === "PENDING_CONFIRM" && hasOrderPrice;
                        const canPayOrder = orderId && order.status === "PENDING_PAYMENT";
                        const canCompleteOrder = orderId && order.status === "PAID";
                        const canCancelOrder =
                          orderId &&
                          ["PENDING_CONFIRM", "PENDING_PAYMENT", "PAID"].includes(order.status);

                        return (
                          <Paper
                            key={orderId ?? index}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#fff",
                            }}
                          >
                            <Stack spacing={1}>
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
                                <Box sx={{ display: "grid", gap: 0.5 }}>
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

                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                {!hasOrderPrice && order.status === "PENDING_CONFIRM" && (
                                  <Typography color="text.secondary" fontSize={12}>
                                    Add a price before confirming.
                                  </Typography>
                                )}

                                <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                                  {canCancelOrder && (
                                    <Button
                                      size="small"
                                      color="error"
                                      onClick={() => cancelOrder(orderId)}
                                    >
                                      Cancel
                                    </Button>
                                  )}

                                  {order.status === "PENDING_CONFIRM" && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={!canConfirmOrder}
                                      onClick={() => confirmOrder(orderId)}
                                    >
                                      Confirm
                                    </Button>
                                  )}

                                  {order.status === "PENDING_PAYMENT" && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={!canPayOrder}
                                      onClick={() => payOrder(orderId)}
                                    >
                                      Pay
                                    </Button>
                                  )}

                                  {order.status === "PAID" && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={!canCompleteOrder}
                                      onClick={() => completeOrder(orderId)}
                                    >
                                      Complete
                                    </Button>
                                  )}
                                </Stack>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>

                {isUser && message.status === "error" && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => retryMessage(message.id)}
                    sx={{ mt: 0.5 }}
                  >
                    Retry
                  </Button>
                )}
              </Box>

              {isUser && (
                <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                  <PersonOutlineIcon fontSize="small" />
                </Avatar>
              )}
            </Box>
          );
        })}

        <div ref={bottomRef} />
      </Box>
    </Box>
  );
}
