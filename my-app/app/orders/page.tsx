"use client";

import * as React from "react";
import { Alert,Avatar,Box,Button,Card,CardActions,CardContent,Chip,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,ListItemIcon,Menu,MenuItem,Pagination,Paper,Snackbar,Stack,Tab,Table,TableBody,TableCell,TableHead,TableRow,Tabs,Typography,useMediaQuery,useTheme } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import SwitchAccountIcon from "@mui/icons-material/SwitchAccount";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { getStatusColor, statusLabels, typeLabels } from "./orderLabels";
import { Order, OrderListResponse, OrderStatus, OrderType } from "./types";

type User = {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
};

const statusTabs: Array<{ label: string; value: OrderStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending confirm", value: "PENDING_CONFIRM" },
  { label: "Pending payment", value: "PENDING_PAYMENT" },
  { label: "Paid", value: "PAID" },
  { label: "Canceled", value: "CANCELED" },
  { label: "Completed", value: "COMPLETED" },
];

const typeTabs: Array<{ label: string; value: OrderType | "ALL" }> = [
  { label: "All types", value: "ALL" },
  { label: "Flight", value: "FLIGHT" },
  { label: "Hotel", value: "HOTEL" },
];

export default function OrdersPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [status, setStatus] = React.useState<OrderStatus | "ALL">("ALL");
  const [type, setType] = React.useState<OrderType | "ALL">("ALL");
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [cancelOrder, setCancelOrder] = React.useState<Order | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    checkLogin();
  }, []);

  React.useEffect(() => {
    loadOrders();
  }, [status, type, page]);

  async function checkLogin() {
    const response = await apiFetch("/users/me");

    if (response.ok) {
      setUser(await response.json());
    }
  }

  async function loadOrders() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (type !== "ALL") {
        params.set("type", type);
      }

      const response = await apiFetch(`/orders?${params.toString()}`);

      if (!response.ok) {
        setMessage("Unable to load orders");
        return;
      }

      const data: OrderListResponse = await response.json();
      setOrders(data.items);
      setTotal(data.total);
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(order: Order, nextStatus: OrderStatus) {
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
      loadOrders();
    } catch {
      setMessage("Unable to connect to the server");
    }
  }

  async function handleConfirmCancel() {
    if (!cancelOrder) return;

    await updateOrderStatus(cancelOrder, "CANCELED");
    setCancelOrder(null);
  }

  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
    } finally {
      setUserMenuAnchor(null);
      setUser(null);
      router.push("/login");
    }
  }

  async function handleSwitchAccount() {
    await handleLogout();
  }

  function renderActions(order: Order) {
    return (
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" onClick={() => router.push(`/orders/${order.id}`)}>
          Details
        </Button>

        {(order.status === "PENDING_CONFIRM" ||
          order.status === "PENDING_PAYMENT") && (
          <Button size="small" color="error" onClick={() => setCancelOrder(order)}>
            Cancel
          </Button>
        )}

        {order.status === "PENDING_CONFIRM" && (
          <Button
            size="small"
            variant="contained"
            onClick={() => updateOrderStatus(order, "PENDING_PAYMENT")}
          >
            Confirm
          </Button>
        )}

        {order.status === "PENDING_PAYMENT" && (
          <Button
            size="small"
            variant="contained"
            onClick={() => updateOrderStatus(order, "PAID")}
          >
            Pay
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f7f8", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1120, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Order Management
            </Typography>
            <Typography color="text.secondary" fontSize={14}>
              View and manage flight and hotel orders.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            {user && (
              <Stack
                component="button"
                type="button"
                direction="row"
                spacing={1.25}
                alignItems="center"
                onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                sx={{
                  border: 0,
                  bgcolor: "transparent",
                  p: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Avatar
                  src={user.avatar || undefined}
                  alt={user.username}
                  sx={{ width: 40, height: 40 }}
                >
                  {user.username.slice(0, 1).toUpperCase()}
                </Avatar>

                <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
                  <Typography noWrap fontWeight={700} fontSize={14}>
                    {user.username}
                  </Typography>
                  <Typography noWrap color="text.secondary" fontSize={12}>
                    {user.email}
                  </Typography>
                </Box>
              </Stack>
            )}

            <Button
              variant="outlined"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => router.push("/chat")}
            >
              Back to chat
            </Button>
          </Stack>
        </Stack>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem onClick={handleSwitchAccount}>
            <ListItemIcon>
              <SwitchAccountIcon fontSize="small" />
            </ListItemIcon>
            Switch account
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        <Paper sx={{ mb: 2, overflowX: "auto" }}>
          <Tabs
            value={status}
            onChange={(_, value) => {
              setStatus(value);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {statusTabs.map((item) => (
              <Tab key={item.value} label={item.label} value={item.value} />
            ))}
          </Tabs>
        </Paper>

        <Paper sx={{ mb: 2, overflowX: "auto" }}>
          <Tabs
            value={type}
            onChange={(_, value) => {
              setType(value);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {typeTabs.map((item) => (
              <Tab key={item.value} label={item.label} value={item.value} />
            ))}
          </Tabs>
        </Paper>

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Paper sx={{ py: 8, textAlign: "center" }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>
              No orders yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Start from AI chat to create a travel booking.
            </Typography>
            <Button variant="contained" onClick={() => router.push("/chat")}>
              Go to chat
            </Button>
          </Paper>
        ) : isMobile ? (
          <Stack spacing={2}>
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography fontWeight={700}>{order.orderNo}</Typography>
                    <Chip
                      size="small"
                      label={statusLabels[order.status]}
                      color={getStatusColor(order.status)}
                    />
                  </Stack>

                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {typeLabels[order.type]} - ${Number(order.totalAmount).toFixed(2)}
                  </Typography>
                  <Typography color="text.secondary" fontSize={13}>
                    {new Date(order.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {renderActions(order)}
                </CardActions>
              </Card>
            ))}
          </Stack>
        ) : (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order No.</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.orderNo}</TableCell>
                    <TableCell>{typeLabels[order.type]}</TableCell>
                    <TableCell>${Number(order.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabels[order.status]}
                        color={getStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell align="right">{renderActions(order)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {total > pageSize && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              page={page}
              count={Math.ceil(total / pageSize)}
              onChange={(_, value) => setPage(value)}
            />
          </Box>
        )}
      </Box>

      <Dialog open={Boolean(cancelOrder)} onClose={() => setCancelOrder(null)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel order?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to cancel this order?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOrder(null)}>No</Button>
          <Button color="error" variant="contained" onClick={handleConfirmCancel}>
            Yes, cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage("")}>
        <Alert severity="info" variant="filled" onClose={() => setMessage("")}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
