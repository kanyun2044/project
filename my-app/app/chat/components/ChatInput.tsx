"use client";

import * as React from "react";
import {Alert,Box,IconButton,InputAdornment,Snackbar,TextField,} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useChat } from "../store/ChatContext";

type Props = {
  centered?: boolean;
};

export default function ChatInput({ centered = false }: Props) {
  const [value, setValue] = React.useState("");
  const { sendMessage, isGenerating, errorMessage, clearError } = useChat();

  async function handleSend() {
    const text = value.trim();
    if (!text || isGenerating) return;

    setValue("");
    await sendMessage(text);
  }

  return (
    <Box
      sx={{
        borderTop: centered ? "none" : "1px solid",
        borderColor: "divider",
        px: { xs: 2, md: 4 },
        py: centered ? 0 : 2,
        bgcolor: centered ? "transparent" : "#fff",
      }}
    >
      <Box sx={{ maxWidth: 840, mx: "auto" }}>
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={value}
          disabled={isGenerating}
          placeholder="send message to AI"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton size="small" disabled={isGenerating}>
                  <AttachFileIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  color="primary"
                  disabled={!value.trim() || isGenerating}
                  onClick={handleSend}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 4,
              bgcolor: "#f7f7f8",
            },
          }}
        />
      </Box>

      <Snackbar open={Boolean(errorMessage)} autoHideDuration={3000} onClose={clearError}>
        <Alert severity="error" variant="filled" onClose={clearError}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
