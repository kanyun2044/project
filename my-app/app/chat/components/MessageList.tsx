"use client";

import * as React from "react";
import { Avatar, Box, Button, Paper, Stack, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "../store/ChatContext";
import ChatOrderCard from "./ChatOrderCard";
import { ChatOrderSnapshot } from "../types";

const hiddenOrderStatusTypes = [
  "ORDER_CONFIRMED",
  "ORDER_PAID",
  "ORDER_CANCELED",
  "ORDER_COMPLETED",
];

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

function createModifyText(order: ChatOrderSnapshot) {
  const details = Object.entries(order.bookingDetails ?? {})
    .filter(([key]) => key !== "totalAmount")
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return `${key}: missing`;
      }

      return `${key}: ${String(value)}`;
    })
    .join(", ");

  return `I want to modify order ${order.orderNo}. Current details: ${details}. Please change `;
}

export default function MessageList() {
  const {
    activeSession,
    retryMessage,
    setInputValue,
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

                        return (
                          <ChatOrderCard
                            key={orderId ?? index}
                            order={order}
                            onConfirm={() => orderId && confirmOrder(orderId)}
                            onCancel={() => orderId && cancelOrder(orderId)}
                            onPay={() => orderId && payOrder(orderId)}
                            onComplete={() => orderId && completeOrder(orderId)}
                            onModify={() => {
                              setInputValue(createModifyText(order));
                              window.dispatchEvent(new Event("chat-input-focus"));
                            }}
                          />
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
