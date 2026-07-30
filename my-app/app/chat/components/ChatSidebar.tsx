"use client";

import * as React from "react";
import {Avatar,Box,Button,Divider,IconButton,List,ListItemButton,ListItemText,TextField,Typography,Dialog,DialogActions,DialogContent,DialogTitle,} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/navigation";
import { useChat } from "../store/ChatContext";
import ClearIcon from "@mui/icons-material/Clear";

type Props = {
  onClose?: () => void;
};

type User = {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
};

export default function ChatSidebar({ onClose }: Props) {
  const router = useRouter();
  const {
    sessions,
    activeSession,
    searchKeyword,
    setSearchKeyword,
    createSession,
    selectSession,
    deleteSession,
  } = useChat();
  const [nameDialogOpen, setNameDialogOpen] = React.useState(false);
  const [chatTitle, setChatTitle] = React.useState("");
  const [user, setUser] = React.useState<User | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteSessionId, setDeleteSessionId] = React.useState<string | null>(null);
  

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchKeyword.toLowerCase()),
  );

  React.useEffect(() => {
    setMounted(true);

    async function loadUser() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data);
      } catch {
        setUser(null);
      }
    }

    loadUser();
  }, []);

  function handleCreateSession() {
    createSession(chatTitle);
    setNameDialogOpen(false);
    setChatTitle("");
    onClose?.();
  }

  async function handleLogout(event: React.MouseEvent) {
    event.stopPropagation();

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  function handleConfirmDelete() {
    if (!deleteSessionId) return;

    deleteSession(deleteSessionId);
    setDeleteSessionId(null);
    setDeleteDialogOpen(false);
  }

  return (
    <Box
      sx={{
        width: 200,
        height: "100vh",
        bgcolor: "#f7f7f8",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
          setChatTitle("");
          setNameDialogOpen(true);
          }}
          sx={{ borderRadius: 2, py: 1 }}
        >
          New chat
        </Button>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search chats"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
            endAdornment: searchKeyword ? (
          <IconButton
            size="small"
            onClick={() => setSearchKeyword("")}
            edge="end"
        >
          <ClearIcon fontSize="small" />
          </IconButton>
          ) : null,
          }}
        />
      </Box>

      <Divider />

      <List sx={{ flex: 1, overflowY: "auto", px: 1, py: 1 }}>
        {filteredSessions.map((session) => (
          <ListItemButton
            key={session.id}
            selected={session.id === activeSession?.id}
            onClick={() => {
              selectSession(session.id);
              onClose?.();
            }}
            sx={{
              mb: 0.5,
              borderRadius: 2,
              alignItems: "flex-start",
              "&.Mui-selected": {
                bgcolor: "#e9e9eb",
              },
            }}
          >
            <ListItemText
              primary={
                <Typography noWrap fontSize={14} fontWeight={500}>
                  {session.title}
                </Typography>
              }
              secondary={mounted ? new Date(session.updatedAt).toLocaleString() : ""}
              secondaryTypographyProps={{
                noWrap: true,
                fontSize: 12,
              }}
            />

            <IconButton
              size="small"
              onClick={(event) => {
              event.stopPropagation();
                setDeleteSessionId(session.id);
                setDeleteDialogOpen(true);
              }}
              >
            <DeleteOutlineIcon fontSize="small" />
            </IconButton>


          </ListItemButton>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        {user ? (
          <Box
            onClick={() => {
              router.push("/homeTest");
              onClose?.();
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": {
                bgcolor: "#e9e9eb",
              },
            }}
          >
            <Avatar
              src={user.avatar || undefined}
              alt={user.username}
              sx={{ width: 42, height: 42, fontSize: 18 }}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap fontSize={15} fontWeight={600}>
                {user.username}
              </Typography>
              <Typography noWrap fontSize={13} color="text.secondary">
                {user.email}
              </Typography>
            </Box>

            <IconButton size="medium" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box
            onClick={() => {
              router.push("/login");
              onClose?.();
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.25,
              borderRadius: 2,
              cursor: "pointer",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "#fff",
              "&:hover": {
                bgcolor: "#f2f3f5",
              },
            }}
          >
            <Avatar sx={{ width: 42, height: 42, fontSize: 18 }}>
              <LoginIcon fontSize="small" />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap fontSize={15} fontWeight={600}>
                Guest
              </Typography>
              <Typography noWrap fontSize={13} color="text.secondary">
                Login to chats
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={nameDialogOpen}
        onClose={() => {
          setNameDialogOpen(false);
          setChatTitle("");
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Name this chat</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Chat title"
            placeholder="Leave empty to use default title"
            value={chatTitle}
            onChange={(event) => setChatTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateSession();
              }
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setNameDialogOpen(false);
              setChatTitle("");
            }}
          >
            Cancel
          </Button>

          <Button variant="contained" onClick={handleCreateSession}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
  open={deleteDialogOpen}
  onClose={() => {
    setDeleteDialogOpen(false);
    setDeleteSessionId(null);
  }}
  fullWidth
  maxWidth="xs"
>
  <DialogTitle>Delete chat?</DialogTitle>

  <DialogContent>
    <Typography color="text.secondary">
      This action cannot be undone.
    </Typography>
  </DialogContent>

  <DialogActions>
    <Button
      onClick={() => {
        setDeleteDialogOpen(false);
        setDeleteSessionId(null);
      }}
    >
      Cancel
    </Button>

    <Button
      color="error"
      variant="contained"
      onClick={handleConfirmDelete}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
}
