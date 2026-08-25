"use client";

import * as React from "react";
import { Alert,Backdrop,Box,Button,Card,CardContent,Chip,CircularProgress,Divider,Paper,Snackbar,Stack,Typography } from "@mui/material";
import { Timeline,TimelineConnector,TimelineContent,TimelineDot,TimelineItem,TimelineSeparator } from "@mui/lab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { getStatusColor, statusLabels, typeLabels } from "../orderLabels";
import { Order, OrderStatus } from "../types";

const timelineSteps: OrderStatus[] = [
  "PENDING_CONFIRM",
  "PENDING_PAYMENT",
  "PAID",
  "COMPLETED",
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  React.useEffect(() => {
    checkLogin();
  }, []);

  React.useEffect(() => {
    loadOrder();
  }, [params.id]);

  React.useEffect(() => {
    function syncOrder() {
      if (document.visibilityState === "visible") {
        loadOrder(false);
      }
    }

    window.addEventListener("focus", syncOrder);
    window.addEventListener("pageshow", syncOrder);
    document.addEventListener("visibilitychange", syncOrder);

    return () => {
      window.removeEventListener("focus", syncOrder);
      window.removeEventListener("pageshow", syncOrder);
      document.removeEventListener("visibilitychange", syncOrder);
    };
  }, [params.id]);

  async function checkLogin() {
    await apiFetch("/users/me");
  }

  async function loadOrder(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await apiFetch(`/orders/${params.id}`);

      if (!response.ok) {
        setMessage("Unable to load order");
        return;
      }

      setOrder(await response.json());
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function updateOrderStatus(nextStatus: OrderStatus) {
    if (!order) return;

    try {
      const response = await apiFetch(`/orders/${order.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          paymentMethod: nextStatus === "PAID" ? "demo" : undefined,
          paymentNo: nextStatus === "PAID" ? `PAY${Date.now()}` : undefined,
        }),
      });

      if (!response.ok) {
        setMessage("Unable to update order");
        return;
      }

      setMessage("Order updated");
      loadOrder();
    } catch {
      setMessage("Unable to connect to the server");
    }
  }

  async function handleConfirmCancel() {
    await updateOrderStatus("CANCELED");
    setCancelDialogOpen(false);
  }

  function renderActions() {
    if (!order) return null;

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
        {order.status === "PENDING_CONFIRM" && (
          <Button variant="contained" onClick={() => updateOrderStatus("PENDING_PAYMENT")}>
            Confirm order
          </Button>
        )}

        {order.status === "PENDING_PAYMENT" && (
          <Button variant="contained" onClick={() => updateOrderStatus("PAID")}>
            Pay
          </Button>
        )}

        {order.status === "PAID" && (
          <Button variant="contained" onClick={() => updateOrderStatus("COMPLETED")}>
            Complete order
          </Button>
        )}

        {(order.status === "PENDING_CONFIRM" ||
          order.status === "PENDING_PAYMENT" ||
          order.status === "PAID") && (
          <Button color="error" onClick={() => setCancelDialogOpen(true)}>
            Cancel order
          </Button>
        )}
      </Stack>
    );
  }

  function handleBackToChat() {
    if (order?.chatSessionId) {
      localStorage.setItem("activeChatSessionId", order.chatSessionId);
    }

    router.push("/chat");
  }

  function renderBookingDetails() {
    if (!order) return null;

    const details = order.bookingDetails ?? {};

    if (order.type === "FLIGHT") {
      return renderDetailItems([
        ["From", details.from],
        ["To", details.to],
        ["Date", details.date],
        ["Passenger", details.passenger],
        ["Flight No.", details.flightNo],
      ]);
    }

    if (order.type === "HOTEL") {
      return renderDetailItems([
        ["City", details.city],
        ["Hotel", details.hotelName],
        ["Check in", details.checkIn],
        ["Check out", details.checkOut],
        ["Guests", details.guests],
        ["Room type", details.roomType],
      ]);
    }

    const entries = Object.entries(details);

    if (entries.length === 0) {
      return <Typography color="text.secondary">No booking details</Typography>;
    }

    return (
      <Stack spacing={1}>
        {entries.map(([key, value]) => (
          <Stack
            key={key}
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography color="text.secondary">{key}</Typography>
            <Typography fontWeight={500}>
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  function renderDetailItems(items: Array<[string, unknown]>) {
    return (
      <Stack spacing={1}>
        {items.map(([label, value]) => (
          <Stack
            key={label}
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography color="text.secondary">{label}</Typography>
            <Typography fontWeight={500}>{value ? String(value) : "-"}</Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  function getTimelineTime(step: OrderStatus) {
    if (!order) return "";

    if (step === "PENDING_CONFIRM") {
      return new Date(order.createdAt).toLocaleString();
    }

    if (step === "PENDING_PAYMENT" && order.confirmedAt) {
      return new Date(order.confirmedAt).toLocaleString();
    }

    if (step === "PAID" && order.paidAt) {
      return new Date(order.paidAt).toLocaleString();
    }

    if (step === "COMPLETED" && order.status === "COMPLETED") {
      return new Date(order.completedAt || order.updatedAt).toLocaleString();
    }

    return "";
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
        <Card sx={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Order not found
            </Typography>
            <Button onClick={() => router.push("/orders")}>Back to orders</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f7f8", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/orders")}>
            Back to orders
          </Button>

          {order.chatSessionId && (
            <Button
              variant="outlined"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={handleBackToChat}
            >
              View chat
            </Button>
          )}
        </Stack>

        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography color="text.secondary" fontSize={13}>
                    Order No.
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {order.orderNo}
                  </Typography>
                </Box>

                <Chip
                  label={statusLabels[order.status]}
                  color={getStatusColor(order.status)}
                  sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>
                Booking details - {typeLabels[order.type]}
              </Typography>
              {renderBookingDetails()}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>
                Amount
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Total amount</Typography>
                  <Typography fontWeight={700}>${Number(order.totalAmount).toFixed(2)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Payment method</Typography>
                  <Typography>{order.paymentMethod || "-"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Payment No.</Typography>
                  <Typography>{order.paymentNo || "-"}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>
                Status timeline
              </Typography>
              <Timeline sx={{ p: 0, m: 0 }}>
                {timelineSteps.map((step, index) => {
                  const activeIndex = timelineSteps.indexOf(order.status);
                  const finished = activeIndex >= index && order.status !== "CANCELED";

                  return (
                    <TimelineItem
                      key={step}
                      sx={{
                        "&::before": {
                          display: "none",
                        },
                      }}
                    >
                      <TimelineSeparator>
                        <TimelineDot color={finished ? "success" : "grey"} />
                        {index < timelineSteps.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pb: 2 }}>
                        <Typography fontWeight={600}>{statusLabels[step]}</Typography>
                        <Typography color="text.secondary" fontSize={13}>
                          {getTimelineTime(step) || "Pending"}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}

                {order.status === "CANCELED" && (
                  <TimelineItem
                    sx={{
                      "&::before": {
                        display: "none",
                      },
                    }}
                  >
                    <TimelineSeparator>
                      <TimelineDot color="error" />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography fontWeight={600}>Canceled</Typography>
                      <Typography color="text.secondary" fontSize={13}>
                        {new Date(order.canceledAt || order.updatedAt).toLocaleString()}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                )}
              </Timeline>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography fontWeight={700}>Order actions</Typography>
                <Divider />
                {renderActions()}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Backdrop
        open={cancelDialogOpen}
        sx={{
          zIndex: 1300,
          px: 2,
        }}
        onClick={() => setCancelDialogOpen(false)}
      >
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            maxWidth: 420,
            p: 3,
            borderRadius: 2,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Typography fontWeight={700} fontSize={18} sx={{ mb: 1 }}>
            Cancel order?
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Are you sure you want to cancel this order?
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => setCancelDialogOpen(false)}>No</Button>
            <Button color="error" variant="contained" onClick={handleConfirmCancel}>
              Yes, cancel
            </Button>
          </Stack>
        </Paper>
      </Backdrop>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity="info" variant="filled" onClose={() => setMessage("")}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
