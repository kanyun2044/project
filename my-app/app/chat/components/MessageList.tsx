"use client";

import * as React from "react";
import { Avatar, Box, Button, Paper, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "../store/ChatContext";

export default function MessageList() {
  const { activeSession, retryMessage } = useChat();
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
