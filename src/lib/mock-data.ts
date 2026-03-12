export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  attachment?: string;
  fileName?: string;
  fileType?: string;
  references?: { title: string; url: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
}

export type ChatMode = "llm" | "agent" | "rag";

export const modeResponses: Record<ChatMode, string[]> = {
  llm: [
    "I'm responding in Direct LLM mode. I can help you with general questions, writing, analysis, and more. How can I assist you today?",
    "That's an interesting question! Let me think about this carefully and provide a thorough answer.",
    "Based on my training data, here's what I know about that topic. Let me break it down for you.",
  ],
  agent: [
    "🔧 Agent mode activated. I'm checking available tools and data sources to help with your request...",
    "I've queried the internal API and retrieved the relevant information. Here's what I found.",
    "Let me execute that action for you. I'll coordinate across multiple systems to get this done.",
  ],
  rag: [
    "📄 I found 3 relevant documents in the knowledge base. Let me synthesize the information for you.",
    "Based on the company documentation (updated Feb 2026), here is the answer to your question.",
    "I've retrieved relevant passages from the internal wiki. Here's a summary of the key points.",
  ],
};

export interface AdminDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export const mockDocuments: AdminDocument[] = [
  { id: "1", name: "Employee Handbook 2026.pdf", type: "PDF", size: "2.4 MB", uploadedBy: "Admin", uploadedAt: "2026-02-15" },
  { id: "2", name: "API Documentation.md", type: "Markdown", size: "890 KB", uploadedBy: "DevOps", uploadedAt: "2026-02-20" },
  { id: "3", name: "Q4 Financial Report.xlsx", type: "Excel", size: "1.2 MB", uploadedBy: "Finance", uploadedAt: "2026-03-01" },
  { id: "4", name: "Security Policies.pdf", type: "PDF", size: "560 KB", uploadedBy: "Security", uploadedAt: "2026-01-10" },
  { id: "5", name: "Product Roadmap.pdf", type: "PDF", size: "3.1 MB", uploadedBy: "Product", uploadedAt: "2026-02-28" },
];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "disabled";
  lastActive: string;
}

export const mockUsers: AdminUser[] = [
  { id: "1", name: "Alice Chen", email: "alice@company.com", role: "Admin", status: "active", lastActive: "2026-03-05" },
  { id: "2", name: "Bob Martinez", email: "bob@company.com", role: "User", status: "active", lastActive: "2026-03-04" },
  { id: "3", name: "Carol Kim", email: "carol@company.com", role: "User", status: "active", lastActive: "2026-03-03" },
  { id: "4", name: "David Patel", email: "david@company.com", role: "User", status: "disabled", lastActive: "2026-02-20" },
  { id: "5", name: "Eva Rossi", email: "eva@company.com", role: "Manager", status: "active", lastActive: "2026-03-05" },
];
