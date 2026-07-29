"use client";

import { AppBar, Box, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useChat } from "../store/ChatContext";

type Props = {
  onMenuClick: () => void;
};

export default function ChatHeader({ onMenuClick }: Props) {
  const { activeSession } = useChat();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Toolbar sx={{ minHeight: 56 }}>
          <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
          <MenuIcon />
          </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap fontWeight={600}>
            {activeSession?.title || "New chat"}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
