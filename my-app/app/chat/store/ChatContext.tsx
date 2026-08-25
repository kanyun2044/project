"use client";

import * as React from "react";
import { ChatAttachment, ChatMessage, ChatSession } from "../types";
import { apiFetch } from "../../lib/api";

type ChatContextValue = {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  searchKeyword: string;
  inputValue: string;
  isGenerating: boolean;
  errorMessage: string;
  setSearchKeyword: (value: string) => void;
  setInputValue: (value: string) => void;
  createSession: (title?: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<void>;
  confirmOrder: (orderId: string) => Promise<void>;
  payOrder: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  clearError: () => void;
  retryMessage: (messageId: string) => Promise<void>;
  
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSseBlock(block: string) {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const dataText = dataLines.join("\n");

  return {
    event,
    data: dataText ? JSON.parse(dataText) : null,
  };
}

async function readSseStream(
  response: Response,
  onEvent: (event: string, data: any) => void,
) {
  if (!response.body) {
    throw new Error("Missing response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n\n")) {
      const endIndex = buffer.indexOf("\n\n");
      const block = buffer.slice(0, endIndex).trim();
      buffer = buffer.slice(endIndex + 2);

      if (block) {
        const parsed = parseSseBlock(block);
        onEvent(parsed.event, parsed.data);
      }
    }
  }
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
  const [inputValue, setInputValue] = React.useState("");
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

React.useEffect(() => {
  if (!activeSessionId || isGenerating) return;

  async function syncActiveSession() {
    const savedSessionId = localStorage.getItem("activeChatSessionId");

    if (!savedSessionId || document.visibilityState !== "visible") {
      return;
    }

    await reloadSessionMessages(savedSessionId);
  }

  window.addEventListener("focus", syncActiveSession);
  document.addEventListener("visibilitychange", syncActiveSession);

  return () => {
    window.removeEventListener("focus", syncActiveSession);
    document.removeEventListener("visibilitychange", syncActiveSession);
  };
}, [activeSessionId, isGenerating]);


    async function retryMessage(messageId: string) {
  const session = activeSession;
  if (!session || isGenerating) return;

  const failedMessage = session.messages.find(
    (message) => message.id === messageId,
  );

  if (!failedMessage || failedMessage.role !== "user") return;

  setSessions((prev) =>
    prev.map((item) =>
      item.id === session.id
        ? {
            ...item,
            messages: item.messages.filter(
              (message) =>
                message.id !== messageId && message.status !== "error",
            ),
          }
        : item,
    ),
  );

  await sendMessage(failedMessage.content);
}



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
    role:
      message.role === "USER"
        ? "user"
        : message.role === "SYSTEM"
          ? "system"
          : "assistant",
    content: message.content,
    createdAt: message.createdAt,
    status: "done",
    attachments: message.attachments ?? [],
    metadata: message.metadata ?? null,
  };
}

function messageHasOrder(message: ChatMessage) {
  const metadata = message.metadata;

  return Boolean(
    metadata?.orderSnapshot ||
      (Array.isArray(metadata?.orderItems) && metadata.orderItems.length > 0),
  );
}

function normalizeSession(session: any): ChatSession {
  const messages = session.messages ? session.messages.map(normalizeMessage) : [];

  return {
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    messages,
    isCustomTitle: session.title !== "New chat",
    hasOrder: Boolean(session.orders?.length) || messages.some(messageHasOrder),
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

 async function sendMessage(content: string, attachments: ChatAttachment[] = []) {
  const text = content.trim();
  if ((!text && attachments.length === 0) || isGenerating) return;

  setIsGenerating(true);
  setErrorMessage("");
  let sessionId = activeSessionId;
  let tempUserMessage: ChatMessage | null = null;
  let tempAssistantMessage: ChatMessage | null = null;

  try {
    if (!sessionId) {
      const createResponse = await apiFetch("/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: text ? text.slice(0, 18) : "File upload",
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

    tempUserMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: now,
      status: "done",
      attachments,
    };

    tempAssistantMessage = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: now,
      status: "loading",
    };

    const userDraftMessage = tempUserMessage;
    const assistantDraftMessage = tempAssistantMessage;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              updatedAt: now,
              messages: [
                ...session.messages,
                userDraftMessage,
                assistantDraftMessage,
              ],
            }
          : session,
      ),
    );

    const response = await apiFetch(`/chats/${sessionId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: text,
        attachments,
      }),
    });

    if (!response.ok) {
      throw new Error("Send failed");
    }

    let streamFailed = false;

    await readSseStream(response, (event, data) => {
      if (event === "error") {
        streamFailed = true;
        return;
      }

      if (event === "user") {
        const userMessage = normalizeMessage(data);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === userDraftMessage.id
                      ? userMessage
                      : message,
                  ),
                }
              : session,
          ),
        );
      }

      if (event === "delta") {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  updatedAt: new Date().toISOString(),
                  messages: session.messages.map((message) =>
                    message.id === assistantDraftMessage.id
                      ? {
                          ...message,
                          content: message.content + String(data?.content ?? ""),
                        }
                      : message,
                  ),
                }
              : session,
          ),
        );
      }

      if (event === "done") {
        const userMessage = normalizeMessage(data.userMessage);
        const assistantMessage = normalizeMessage(data.assistantMessage);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  title:
                    session.messages.length === 0 && !session.isCustomTitle
                      ? text.slice(0, 18)
                      : session.title,
                  hasOrder:
                    session.hasOrder ||
                    Boolean(
                      assistantMessage.metadata?.orderSnapshot ||
                        assistantMessage.metadata?.orderItems?.length,
                    ),
                  messages: session.messages.map((message) =>
                    message.id === userDraftMessage.id
                      ? userMessage
                      : message.id === assistantDraftMessage.id
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
      }
    });

    if (streamFailed) {
      throw new Error("Send failed");
    }
  } catch {
    setErrorMessage("Send message failed, please try again later.");

    if (sessionId && tempUserMessage && tempAssistantMessage) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === tempUserMessage?.id
                    ? {
                        ...message,
                        status: "error",
                      }
                    : message.id === tempAssistantMessage?.id
                      ? {
                          ...message,
                          content: "Message failed.",
                          status: "error",
                        }
                      : message,
                ),
              }
            : session,
        ),
      );
    }
  } finally {
    setIsGenerating(false);
  }
}

async function reloadSessionMessages(sessionId: string) {
  const response = await apiFetch(`/chats/${sessionId}/messages`);

  if (!response.ok) {
    setErrorMessage("Unable to load messages");
    return;
  }

  const data = await response.json();
  const messages = data.map(normalizeMessage);

  setSessions((prev) =>
    prev.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            messages,
          }
        : session,
    ),
  );
}

async function confirmOrder(orderId: string) {
  if (!activeSession) return;

  try {
    const response = await apiFetch(
      `/chats/${activeSession.id}/orders/${orderId}/confirm`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      setErrorMessage("Unable to confirm order");
      return;
    }

    await reloadSessionMessages(activeSession.id);
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

async function cancelOrder(orderId: string) {
  if (!activeSession) return;

  try {
    const response = await apiFetch(
      `/chats/${activeSession.id}/orders/${orderId}/cancel`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      setErrorMessage("Unable to cancel order");
      return;
    }

    await reloadSessionMessages(activeSession.id);
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

async function payOrder(orderId: string) {
  if (!activeSession) return;

  try {
    const response = await apiFetch(
      `/chats/${activeSession.id}/orders/${orderId}/pay`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      setErrorMessage("Unable to pay order");
      return;
    }

    await reloadSessionMessages(activeSession.id);
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

async function completeOrder(orderId: string) {
  if (!activeSession) return;

  try {
    const response = await apiFetch(
      `/chats/${activeSession.id}/orders/${orderId}/complete`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      setErrorMessage("Unable to complete order");
      return;
    }

    await reloadSessionMessages(activeSession.id);
  } catch {
    setErrorMessage("Unable to connect to the server");
  }
}

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSession,
        searchKeyword,
        inputValue,
        isGenerating,
        errorMessage,
        setSearchKeyword,
        setInputValue,
        createSession,
        selectSession,
        deleteSession,
        sendMessage,
        confirmOrder,
        payOrder,
        completeOrder,
        cancelOrder,
        clearError: () => setErrorMessage(""),
        retryMessage 
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
