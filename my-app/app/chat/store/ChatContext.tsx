"use client";

import * as React from "react";
import { ChatMessage, ChatSession } from "../types";
import { apiFetch } from "../../lib/api";

type ChatContextValue = {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  searchKeyword: string;
  isGenerating: boolean;
  errorMessage: string;
  setSearchKeyword: (value: string) => void;
  createSession: (title?: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialSession: ChatSession = {
  id: createId(),
  title: "New Chat",
  updatedAt: new Date().toISOString(),
  messages: [],
  isCustomTitle: false,
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState("");
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  

  const activeSession =sessions.find((session) => session.id === activeSessionId) ?? null;

  React.useEffect(() => {
async function loadSessions() {
  try {
    const response = await apiFetch("/chats");

    if (!response.ok) {
      setErrorMessage("Unable to load chats");
      return;
    }

      const data = await response.json();
      const nextSessions: ChatSession[] = data.map(normalizeSession);
      const savedSessionId = localStorage.getItem("activeChatSessionId");
      const nextActiveSessionId =
        savedSessionId &&
        nextSessions.some((session) => session.id === savedSessionId)
          ? savedSessionId
          : nextSessions[0]?.id ?? "";

      setSessions(nextSessions);
      setActiveSessionId(nextActiveSessionId);

      if (nextActiveSessionId) {
        const messagesResponse = await apiFetch(
          `/chats/${nextActiveSessionId}/messages`,
        );

      if (!messagesResponse.ok) {
        setErrorMessage("Unable to load messages");
        return;
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.map(normalizeMessage);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === nextActiveSessionId
              ? {
                  ...session,
                  messages,
              }
            : session,
        ),
      );
    }
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

  loadSessions();
}, []);

async function createSession(title?: string) {
  const customTitle = title?.trim();

  try {
    const response = await apiFetch("/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: customTitle || undefined,
      }),
    });

    if (!response.ok) {
      setErrorMessage("Unable to create chat");
      return;
    }

    const data = await response.json();
    const session = normalizeSession({
      ...data,
      messages: [],
    });

    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    localStorage.setItem("activeChatSessionId", session.id);
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}


function normalizeMessage(message: any): ChatMessage {
  return {
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    content: message.content,
    createdAt: message.createdAt,
    status: "done",
  };
}

function normalizeSession(session: any): ChatSession {
  return {
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    messages: session.messages ? session.messages.map(normalizeMessage) : [],
    isCustomTitle: session.title !== "New chat",
  };
}


  async function selectSession(id: string) {
  if (isGenerating) return;

  setActiveSessionId(id);
  localStorage.setItem("activeChatSessionId", id);

  try {
    const response = await apiFetch(`/chats/${id}/messages`);

    if (!response.ok) {
      setErrorMessage("Unable to load messages");
      return;
    }

    const data = await response.json();
    const messages = data.map(normalizeMessage);

    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              messages,
            }
          : session,
      ),
    );
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}


  async function deleteSession(id: string) {
  try {
    const response = await apiFetch(`/chats/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setErrorMessage("Unable to delete chat");
      return;
    }

    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== id);

      if (id === activeSessionId) {
        const nextActiveSessionId = next[0]?.id ?? "";
        setActiveSessionId(nextActiveSessionId);

        if (nextActiveSessionId) {
          localStorage.setItem("activeChatSessionId", nextActiveSessionId);
        } else {
          localStorage.removeItem("activeChatSessionId");
        }
      }

      return next;
    });
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

 async function sendMessage(content: string) {
  const text = content.trim();
  if (!text || isGenerating) return;

  setIsGenerating(true);
  setErrorMessage("");

  try {
    let sessionId = activeSessionId;

    if (!sessionId) {
      const createResponse = await apiFetch("/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: text.slice(0, 18),
        }),
      });

      if (!createResponse.ok) {
        setErrorMessage("Unable to create chat");
        return;
      }

      const createdSession = normalizeSession({
        ...(await createResponse.json()),
        messages: [],
      });

      sessionId = createdSession.id;
      setSessions((prev) => [createdSession, ...prev]);
      setActiveSessionId(sessionId);
      localStorage.setItem("activeChatSessionId", sessionId);
    }

    const now = new Date().toISOString();

    const tempUserMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: now,
      status: "done",
    };

    const tempAssistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: now,
      status: "loading",
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              updatedAt: now,
              messages: [
                ...session.messages,
                tempUserMessage,
                tempAssistantMessage,
              ],
            }
          : session,
      ),
    );

    const response = await apiFetch(`/chats/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: text,
      }),
    });

    if (!response.ok) {
      throw new Error("Send failed");
    }

    const data = await response.json();
    const userMessage = normalizeMessage(data.userMessage);
    const assistantMessage = normalizeMessage(data.assistantMessage);
    const fullAnswer = assistantMessage.content;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((message) =>
                message.id === tempUserMessage.id
                  ? userMessage
                  : message.id === tempAssistantMessage.id
                    ? {
                        ...tempAssistantMessage,
                        content: "",
                      }
                    : message,
              ),
            }
          : session,
      ),
    );

    for (const char of fullAnswer) {
      await new Promise((resolve) => setTimeout(resolve, 35));

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                updatedAt: new Date().toISOString(),
                messages: session.messages.map((message) =>
                  message.id === tempAssistantMessage.id
                    ? {
                        ...message,
                        content: message.content + char,
                      }
                    : message,
                ),
              }
            : session,
        ),
      );
    }

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title:
                session.messages.length === 0 && !session.isCustomTitle
                  ? text.slice(0, 18)
                  : session.title,
              messages: session.messages.map((message) =>
                message.id === tempAssistantMessage.id
                  ? {
                      ...assistantMessage,
                      status: "done",
                    }
                  : message,
              ),
            }
          : session,
      ),
    );
  } catch {
    setErrorMessage("Send message failed, please try again later.");
  } finally {
    setIsGenerating(false);
  }
}

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSession,
        searchKeyword,
        isGenerating,
        errorMessage,
        setSearchKeyword,
        createSession,
        selectSession,
        deleteSession,
        sendMessage,
        clearError: () => setErrorMessage(""),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const value = React.useContext(ChatContext);

  if (!value) {
    throw new Error("useChat must be used inside ChatProvider");
  }

  return value;
}
