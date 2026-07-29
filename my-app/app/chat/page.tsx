"use client";

import * as React from "react";
import { Box, Drawer, Typography, useMediaQuery, useTheme } from "@mui/material";
import ChatHeader from "./components/ChatHeader";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import ChatSidebar from "./components/ChatSidebar";
import { ChatProvider, useChat } from "./store/ChatContext";

function ChatMain({ onMenuClick }: { onMenuClick: () => void }) {
  const { activeSession } = useChat();
  const isEmpty = !activeSession || activeSession.messages.length === 0;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ChatHeader onMenuClick={onMenuClick} />

      {isEmpty ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 2, md: 4 },
            pb: 10,
          }}
        >
          <Typography
            variant="h4"
            fontWeight={600}
            textAlign="center"
            sx={{ mb: 3 }}
          >
            What can I help you today?
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 760 }}>
            <ChatInput centered />
          </Box>
        </Box>
      ) : (
        <>
          <MessageList />
          <ChatInput />
        </>
      )}
    </Box>
  );
}

export default function ChatPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

return (
  <ChatProvider>
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#fff" }}>
      {isMobile ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <ChatSidebar onClose={() => setDrawerOpen(false)} />
        </Drawer>
      ) : (
        sidebarOpen && <ChatSidebar />
      )}

      <ChatMain
        onMenuClick={() => {
          if (isMobile) {
            setDrawerOpen(true);
          } else {
            setSidebarOpen((prev) => !prev);
          }
        }}
      />
    </Box>
  </ChatProvider>
);

}