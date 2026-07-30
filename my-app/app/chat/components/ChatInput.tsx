"use client";

import * as React from "react";
import {Alert,Box,IconButton,InputAdornment,Snackbar,TextField,} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useChat } from "../store/ChatContext";
import { apiFetch } from "../../lib/api";
import { ChatAttachment } from "../types";

type Props = {
  centered?: boolean;
};

export default function ChatInput({ centered = false }: Props) {
  const [value, setValue] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { sendMessage, isGenerating, errorMessage, clearError } = useChat();

  async function handleSend() {
    const text = value.trim();
    if ((!text && files.length === 0) || isGenerating) return;

    try {
      const uploadedAttachments: ChatAttachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiFetch("/chats/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        uploadedAttachments.push(await response.json());
      }

      setValue("");
      setFiles([]);
      await sendMessage(text || "Sent attachments.", uploadedAttachments);
    } catch {
      clearError();
    }
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
        {files.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            {files.map((file, index) => (
              <Box
                key={`${file.name}-${index}`}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: "#eef0f3",
                  fontSize: 13,
                }}
              >
                {file.name}
              </Box>
            ))}
          </Box>
        )}

        <input
          ref={fileInputRef}
          hidden
          multiple
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={(event) => {
            const selectedFiles = Array.from(event.target.files ?? []);
            setFiles(selectedFiles);
            event.target.value = "";
          }}
        />

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
                <IconButton
                  size="small"
                  disabled={isGenerating}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AttachFileIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  color="primary"
                  disabled={(!value.trim() && files.length === 0) || isGenerating}
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
