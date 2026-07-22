"use client";

import * as React from "react";
import {Alert,Avatar,Box,Button,CircularProgress,Typography,TextField,Snackbar,} from "@mui/material";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type User = {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  avatar: string | null;
};

export default function HomeTest() {
  const [user, setUser] = React.useState<User | null>(null);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [logoutSnackbar, setLogoutSnackbar] =React.useState(false);
  const [deleteSnackbar, setDeleteSnackbar] =React.useState(false);


  const router = useRouter();

  React.useEffect(() => {
    async function getProfile() {
      try {
        const response = await apiFetch("/users/me", {
        method: "GET",
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(
          data.message || "Unable to load user information",
        );

        if (response.status === 401) {
          router.replace("/login");
        }

        return;
      }

        setUser(data);
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

    getProfile();
  }, [router]);


  async function deleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account?",
    );

   if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch("/users/me", {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage("Unable to delete account");
        return;
      }

      setDeleteSnackbar(true);

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch {
      setMessage("Unable to connect to the server");
    }
}


  async function logout() {
    try {
      const response = await apiFetch("/auth/logout", {
        method: "POST",
    });

      if (!response.ok) {
        setMessage("Logout failed");
        return;
      }

      setLogoutSnackbar(true);

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch {
      setMessage("Unable to connect to the server");
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          mt: 20,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 400,
        mx: "auto",
        mt: 20,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {message && <Alert severity="error">{message}</Alert>}
      <Snackbar
        open={logoutSnackbar}
        autoHideDuration={2000}
        onClose={() => setLogoutSnackbar(false)}
        anchorOrigin={{
        vertical: "top",
        horizontal: "center",
        }}
      >
      <Alert
        severity="success"
        variant="filled"
        onClose={() => setLogoutSnackbar(false)}
      >
      Logout successful
      </Alert>
      </Snackbar>





      <Snackbar
      open={deleteSnackbar}
      autoHideDuration={2000}
      onClose={() => setDeleteSnackbar(false)}
      anchorOrigin={{vertical: "top",horizontal: "center",}}
      >
      <Alert
      severity="success"
      variant="filled"
      onClose={() => setDeleteSnackbar(false)}
      >
      Account deleted successfully
      </Alert>
      </Snackbar>





      {user && (
        <>
          <Alert severity="success">Login successful</Alert>

          <Avatar
            src={user.avatar || undefined}
            alt={user.username}
            sx={{width: 96,height: 96,mx: "auto",}}
          />

          <Typography variant="h5">
            Welcome, {user.username}
          </Typography>

          <Typography>Email: {user.email}</Typography>

          <Typography>
            Phone number: {user.phoneNumber}
          </Typography>

          <Typography>User ID: {user.id}</Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/editProfile")}
          >
            Edit Profile
          </Button>


          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push("/changePassword")}
          >
            Change Password
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={logout}
          >
            Logout
          </Button>

          <Button
          variant="outlined"
          color="error"
          onClick={deleteAccount}
          >
          Delete Account
          </Button>
        </>
      )}
    </Box>
  );
}