"use client";

import * as React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

type User = {
  username: string;
  phoneNumber: string;
  avatar: string | null;
};

export default function EditProfilePage() {
  const [username, setUsername] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [avatar, setAvatar] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const router = useRouter();

  React.useEffect(() => {
    async function getProfile() {
      try {
        const response = await apiFetch("/users/me");
        const data: User & { message?: string } =
          await response.json();

        if (!response.ok) {
          setMessage(data.message || "Unable to load profile");
          return;
        }

        setUsername(data.username);
        setPhoneNumber(data.phoneNumber);
        setAvatar(data.avatar || "");
      } catch {
        setMessage("Unable to connect to the server");
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, []);

  async function updateProfile() {
    setMessage("");
    setSuccess(false);

    if (username.trim() === "") {
      setMessage("Username can't be empty");
      return;
    }

    if (phoneNumber.trim() === "") {
      setMessage("Phone number can't be empty");
      return;
    }

    if (avatar.trim() !== "") {
      try {
        new URL(avatar);
      } catch {
        setMessage("Avatar must be a valid URL");
        return;
      }
    }

    setSaving(true);

    try {
      const response = await apiFetch("/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          phoneNumber: phoneNumber.trim(),
          avatar: avatar.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;

        setMessage(errorMessage || "Unable to update profile");
        return;
      }

      setSuccess(true);
      setMessage("Profile updated successfully");

      setTimeout(() => {
        router.push("/homeTest");
      }, 1500);
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ mt: 20, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 400,
        maxWidth: "calc(100% - 32px)",
        mx: "auto",
        mt: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h5">Edit Profile</Typography>

      <Avatar
        src={avatar || undefined}
        alt={username}
        sx={{ width: 96, height: 96, mx: "auto" }}
      />

      {message && (
        <Alert severity={success ? "success" : "error"}>
          {message}
        </Alert>
      )}

      <TextField
        label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <TextField
        label="Phone Number"
        value={phoneNumber}
        onChange={(event) => setPhoneNumber(event.target.value)}
      />

      <TextField
        label="Avatar URL"
        value={avatar}
        onChange={(event) => setAvatar(event.target.value)}
      />

      <Button
        variant="contained"
        disabled={saving}
        onClick={updateProfile}
      >
        {saving ? "Saving..." : "Save"}
      </Button>

      <Button
        variant="outlined"
        disabled={saving}
        onClick={() => router.push("/homeTest")}
      >
        Back
      </Button>
    </Box>
  );
}