export type ChatRole = "user" | "assistant";

export type ChatAttachment = {
  id?: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: "loading" | "done" | "error";
  attachments?: ChatAttachment[];
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  isCustomTitle?: boolean;
};
