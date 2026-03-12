import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Sparkles, Plus, Send, Bot, Brain, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeft, LogOut, Settings, ChevronDown, X, ChevronRight,
  Paperclip, FileText, AlertCircle, MoreVertical, Edit2, Share2, Trash2, Download, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatMode, Conversation } from "@/lib/mock-data";
import { API_BASE_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const modeInfo: Record<ChatMode, { label: string; icon: React.ElementType; color: string }> = {
  llm: { label: "Direct LLM", icon: Bot, color: "text-primary" },
  agent: { label: "Agent", icon: Brain, color: "text-primary" },
  rag: { label: "RAG", icon: FileSearch, color: "text-primary" },
};

const SourcesSection = ({ references }: { references: { title: string; url: string; document_id?: string }[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getHostname = (url: string) => {
    try {
      if (!url || url === "#") return null;
      return new URL(url).hostname;
    } catch { return null; }
  };

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 mb-2 w-full text-left group"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
          <Sparkles className="h-3 w-3" /> Sources
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
            {references.length}
          </span>
        </div>
        <div className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {references.map((ref, i) => {
            const hostname = getHostname(ref.url);
            const isWebRef = !!hostname;

            return isWebRef ? (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 rounded-lg border bg-background/50 p-2 text-xs transition-colors hover:bg-accent hover:text-accent-foreground group"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium group-hover:bg-primary/20 group-hover:text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{ref.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{hostname}</div>
                </div>
              </a>
            ) : (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border bg-background/50 p-2 text-xs"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-medium text-primary">
                  <FileText className="h-3 w-3" />
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{ref.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">Internal Document</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RoleSelectionDialog = ({ onSelect }: { onSelect: (role: string) => void }) => {
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSelect(role);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Role</DialogTitle>
          <DialogDescription>
            Please select your organizational role to personalize your experience.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</> : "Confirm Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, userRole, syncCurrentRole, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<ChatMode>("llm");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  
  // History State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorHeader) {
      const timer = setTimeout(() => setErrorHeader(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorHeader]);

  // Load history once auth is fully ready (user set + role fetched)
  useEffect(() => {
    if (user && userRole !== undefined) {
      fetchConversations();
    }
  }, [user, userRole]);

  // When mode changes, auto-start a new conversation
  const handleModeChange = async (newMode: ChatMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([]);
    setActiveConversationId(null);
    // Automatically create a new conversation for the new mode
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "New Chat" })
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      }
    } catch (e) {
      console.error("Failed to create new chat on mode switch", e);
    }
  };

  useEffect(() => {
    if (editingTitleId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTitleId]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) { console.error(e); }
  };

  const startNewChat = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "New Chat" })
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
      }
    } catch (e) {
      toast.error("Failed to create new chat");
    }
  };

  const loadConversation = async (id: string) => {
    if (!user) return;
    setActiveConversationId(id);
    setMessages([]);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const loaded: ChatMessage[] = data.map((m: any, i: number) => ({
          id: `load-${i}`,
          role: m.role === "agent" ? "bot" : m.role,
          content: m.content,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(loaded);
      }
    } catch (e) {
      toast.error("Failed to load conversation");
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (!user || !editTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations/${id}/title`, {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: editTitleValue.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => prev.map(c => c.id === id ? updated : c));
        toast.success("Conversation renamed");
      }
    } catch (e) {
      toast.error("Failed to rename conversation");
    } finally {
      setEditingTitleId(null);
    }
  };

  const deleteConversation = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      }
    } catch (e) {
      toast.error("Failed to delete conversation");
    }
  };

  const shareConversation = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations/${id}/share`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}${data.url}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied to clipboard!");
      }
    } catch (e) {
      toast.error("Failed to generate share link");
    }
  };

  const downloadPdf = async () => {
    if (!user || !activeConversationId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/history/conversations/${activeConversationId}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation_${activeConversationId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("PDF downloaded successfully");
      } else {
        toast.error("Failed to download PDF");
      }
    } catch (e) {
      toast.error("Failed to download PDF");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
    e.target.value = "";
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() && !selectedFile) return;
    
    setErrorHeader(null);

    const currentInput = input;
    const currentFile = selectedFile;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: currentInput.trim(), 
      timestamp: new Date(),
      attachment: previewUrl || undefined,
      fileName: currentFile?.name,
      fileType: currentFile?.name.split('.').pop()?.toUpperCase()
    };
    setMessages((prev) => [...prev, userMsg]);
    
    setInput("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsTyping(true);

    try {
      const token = await user?.getIdToken();
      const historyItems = messages.map((m) => ({ role: m.role, content: m.content }));

      // Auto-create conversation if user starts typing without one
      let convId = activeConversationId;
      if (!convId && token) {
        try {
          const createRes = await fetch(`${API_BASE_URL}/api/history/conversations`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: "New Chat" })
          });
          if (createRes.ok) {
            const newConv = await createRes.json();
            convId = newConv.id;
            setActiveConversationId(convId);
            setConversations(prev => [newConv, ...prev]);
          }
        } catch (e) {
          console.error("Failed to auto-create conversation", e);
        }
      }

      const formData = new FormData();
      formData.append("message", currentInput);
      formData.append("mode", mode);
      formData.append("history", JSON.stringify(historyItems));
      if (convId) {
        formData.append("conversation_id", convId);
      }
      
      let endpoint = `${API_BASE_URL}/api/chat`;
      
      if (currentFile) {
        formData.append("file", currentFile);
        const ext = currentFile.name.split(".").pop()?.toLowerCase();
        const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp"];
        
        if (ext && !imageExtensions.includes(ext)) {
          endpoint = `${API_BASE_URL}/api/chat/upload`;
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: data.reply,
        timestamp: new Date(),
        references: data.references,
      };
      setMessages((prev) => [...prev, botMsg]);
      
      // Refresh conversations list to show updated title/timestamp
      fetchConversations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Please try again.";
      setErrorHeader(errorMessage);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: `⚠️ Failed to get a response. ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const ModeIcon = modeInfo[mode].icon;

  return (
    <div className="flex h-screen bg-background text-foreground selection:bg-primary/20">
      {user && !userRole && (
        <RoleSelectionDialog onSelect={async (role) => { await syncCurrentRole(role); }} />
      )}
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300",
        sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden border-r-0"
      )}>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm hover:opacity-90 transition-opacity">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight text-sidebar-foreground">NexusAI</span>
        </div>

        <div className="p-4">
          <Button variant="outline" className="w-full justify-start gap-2 shadow-sm" onClick={startNewChat}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>

        {/* Mode selector */}
        <div className="px-4 pb-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Mode</p>
          {(Object.keys(modeInfo) as ChatMode[]).map((m) => {
            const info = modeInfo[m];
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all duration-200",
                  mode === m 
                    ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <info.icon className="h-4 w-4" /> {info.label}
              </button>
            );
          })}
        </div>

        {/* Chat history */}
        <div className="px-4 mt-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">History</p>
        </div>
        <ScrollArea className="flex-1 px-3 pb-4">
          {conversations.length === 0 ? (
             <div className="text-center text-xs text-muted-foreground py-4">No recent chats.</div>
          ) : (
             conversations.map((c) => (
               <div
                 key={c.id}
                 className={cn(
                   "group relative mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all duration-200",
                   activeConversationId === c.id 
                     ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium" 
                     : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                 )}
               >
                 <button 
                    className="flex-1 flex items-center gap-2 truncate text-left"
                    onClick={() => loadConversation(c.id)}
                 >
                   <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                   {editingTitleId === c.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(c.id);
                          if (e.key === "Escape") setEditingTitleId(null);
                        }}
                        className="flex-1 bg-transparent px-1 border-b border-primary outline-none focus:ring-0 text-sm h-5"
                        onClick={(e) => e.stopPropagation()}
                      />
                   ) : (
                      <span className="truncate flex-1">{c.title}</span>
                   )}
                 </button>
                 
                 {/* Item Actions */}
                 <div className="absolute right-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-sidebar-accent">
                           <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                         <DropdownMenuItem onClick={() => {
                            setEditingTitleId(c.id);
                            setEditTitleValue(c.title);
                         }}>
                            <Edit2 className="h-4 w-4 mr-2" /> Rename
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => shareConversation(c.id)}>
                            <Share2 className="h-4 w-4 mr-2" /> Share
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => {
                               if (window.confirm("Are you sure you want to delete this conversation?")) {
                                  deleteConversation(c.id);
                               }
                            }}
                         >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
               </div>
             ))
          )}
        </ScrollArea>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-background/95 backdrop-blur z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-accent/50">
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground shadow-sm">
              <ModeIcon className="h-3 w-3" /> {modeInfo[mode].label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeConversationId && messages.length > 0 && (
               <Button variant="outline" size="sm" onClick={downloadPdf} className="gap-2 shadow-sm hover:shadow transition-shadow">
                  <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export PDF</span>
               </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-accent/50">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1.5 hover:bg-accent/50 rounded-full pl-1.5 pr-3">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium truncate opacity-70">
                   {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2 cursor-pointer"><Settings className="h-4 w-4 text-muted-foreground mr-1" /> Admin Panel</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await logout(); navigate("/login"); }} className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive mt-1"><LogOut className="h-4 w-4 mr-1" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Chat area */}
        <ScrollArea className="flex-1 bg-gradient-to-b from-background to-background/50">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-inner">
                  <ModeIcon className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">How can I help you today?</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                  You're currently using <span className="font-semibold text-primary">{modeInfo[mode].label}</span> mode. Feel free to ask me anything.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("mb-6 flex", msg.role === "user" ? "justify-end" : "justify-start animate-in fade-in slide-in-from-left-2 duration-300")}>
                {msg.role === "bot" && (
                   <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-sm mt-1">
                      <ModeIcon className="h-4 w-4 text-primary" />
                   </div>
                )}
                <div className={cn(
                  "max-w-[85%] flex flex-col gap-2 rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm ml-12"
                    : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                )}>
                  {msg.attachment && (
                    <img src={msg.attachment} alt="Attachment" className="max-w-xs rounded-xl object-cover shadow-sm border border-white/10" />
                  )}
                  {msg.role === "user" && msg.fileName && !msg.attachment && (
                    <div className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-2 text-xs border border-primary-foreground/20 mb-1 w-fit shadow-sm">
                      <FileText className="h-3.5 w-3.5 opacity-80" />
                      <span className="truncate max-w-[150px] font-medium">{msg.fileName}</span>
                      <Badge variant="outline" className="h-4 px-1.5 py-0 text-[9px] bg-primary-foreground/20 text-primary-foreground border-transparent uppercase">{msg.fileType}</Badge>
                    </div>
                  )}
                  {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                  {msg.role === "bot" && msg.references && msg.references.length > 0 && (
                    <SourcesSection references={msg.references} />
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-6 flex justify-start animate-in fade-in">
                <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-sm mt-1">
                   <ModeIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-card border border-border/50 px-5 py-4 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={scrollRef} className="h-2" />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background/95 backdrop-blur px-4 py-4 sm:px-6 z-10">
          {selectedFile && (
            <div className="mx-auto flex max-w-3xl w-full mb-3 px-1 items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              {previewUrl ? (
                <div className="relative inline-block group shadow-md rounded-xl">
                  <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-xl object-cover border" />
                  <button
                    onClick={removeFile}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-transform hover:scale-105 opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-2 text-sm w-fit max-w-full shadow-sm">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate font-medium text-sm">{selectedFile.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                       {(() => {
                         const ext = selectedFile.name.split('.').pop()?.toUpperCase();
                         const colorMap: Record<string, string> = {
                           PDF: "bg-red-500/10 text-red-600 border-red-500/20",
                           DOCX: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                           DOC: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                           XLSX: "bg-green-500/10 text-green-600 border-green-500/20",
                           XLS: "bg-green-500/10 text-green-600 border-green-500/20",
                           CSV: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                           TXT: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                         };
                         const colors = colorMap[ext || ""] || "bg-primary/5 text-primary border-primary/20";
                         return <Badge variant="outline" className={cn("px-1.5 py-0 h-4 text-[9px] font-bold tracking-wider", colors)}>{ext}</Badge>;
                       })()}
                       <span className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          
          {errorHeader && (
             <div className="mx-auto flex max-w-3xl w-full mb-3 px-3 py-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorHeader}
             </div>
          )}

          <div className="mx-auto flex max-w-3xl w-full items-end gap-2 bg-background p-1.5 rounded-2xl border shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-shadow">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
            />
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="shrink-0 h-10 w-10 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea
              placeholder={activeConversationId ? "Continue your conversation..." : "Ask a question..." }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 px-2 py-3 md:text-md"
              rows={1}
            />
            <Button 
              size="icon" 
              onClick={sendMessage} 
              disabled={(!input.trim() && !selectedFile) || isTyping}
              className="h-10 w-10 shrink-0 rounded-xl transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2.5 max-w-3xl text-center text-[11px] text-muted-foreground opacity-70">
            NexusAI may produce inaccurate information. Please verify important content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
