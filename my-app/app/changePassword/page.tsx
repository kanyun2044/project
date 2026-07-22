"use client"
import * as React from "react";
import {Alert,Box,Button,CircularProgress,Typography,TextField,} from "@mui/material";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";

export default function ChangePasswordPage() {

    const [oldPassword, setOldPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [passwordMessage, setPasswordMessage] = React.useState("");
    const [passwordSuccess, setPasswordSuccess] = React.useState(false);

    const router = useRouter();


    async function handleChangePassword() {
        setPasswordMessage("");
        setPasswordSuccess(false);

        if (oldPassword === "") {
            setPasswordMessage("Old password can't be empty");
            return;
        }

        if (newPassword === oldPassword) {
            setPasswordMessage(
            "New password cannot be the same as old password",
            );
        return;
        }

        if (newPassword === "") {
            setPasswordMessage("New password can't be empty");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage(
            "New password must contain at least 6 characters",
        );
            return;
        }

        if (confirmPassword === "") {
            setPasswordMessage("Please confirm your new password");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage("New passwords do not match");
            return;
        }


        try {
            const response = await apiFetch(
             "/users/me/password",
              {
              method: "POST",
              headers: {
              "Content-Type": "application/json",
              },
              body: JSON.stringify({
              oldPassword,
              newPassword,
              confirmPassword,
            }),
        },
);

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;

      setPasswordMessage(
        errorMessage || "Unable to change password",
      );
      return;
    }

      setPasswordSuccess(true);
      setPasswordMessage(
        "Password changed successfully. Please login again.",
    );

      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } catch {
      setPasswordMessage("Unable to connect to the server");
    }
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
      <Typography variant="h5">
        Change Password
      </Typography>

      {passwordMessage && (
        <Alert severity={passwordSuccess ? "success" : "error"}>
          {passwordMessage}
        </Alert>
      )}

      <TextField
        label="Old Password"
        type="password"
        value={oldPassword}
        onChange={(event) => setOldPassword(event.target.value)}
      />

      <TextField
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />

      <TextField
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      <Button variant="contained" onClick={handleChangePassword}>
        Confirm
      </Button>

      <Button
        variant="outlined"
        onClick={() => router.push("/homeTest")}
      >
        Back
      </Button>
    </Box>
  );

}