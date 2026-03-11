import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Sparkles, Plus, Send, Bot, Brain, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeft, LogOut, Settings, ChevronDown, ImageIcon, X, ChevronRight,
  Paperclip, FileText, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatMessage, ChatMode, mockChatHistory } from "@/lib/mock-data";
import { API_BASE_URL } from "@/lib/api";

const modeInfo: Record<ChatMode, { label: string; icon: React.ElementType; color: string }> = {
  llm: { label: "Direct LLM", icon: Bot, color: "text-primary" },
  agent: { label: "Agent", icon: Brain, color: "text-primary" },
  rag: { label: "RAG", icon: FileSearch, color: "text-primary" },
};

const SourcesSection = ({ references }: { references: { title: string; url: string }[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
          {references.map((ref, i) => (
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
                <div className="text-[10px] text-muted-foreground truncate">{new URL(ref.url).hostname}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<ChatMode>("llm");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorHeader) {
      const timer = setTimeout(() => setErrorHeader(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorHeader]);

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

      const formData = new FormData();
      formData.append("message", currentInput);
      formData.append("mode", mode);
      formData.append("history", JSON.stringify(historyItems));
      
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
      )}>
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground">NexusAI</span>
        </div>

        <div className="p-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setMessages([])}>
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>

        {/* Mode selector */}
        <div className="px-3 pb-2">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Mode</p>
          {(Object.keys(modeInfo) as ChatMode[]).map((m) => {
            const info = modeInfo[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  mode === m ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <info.icon className="h-4 w-4" /> {info.label}
              </button>
            );
          })}
        </div>

        {/* Chat history */}
        <div className="px-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">History</p>
        </div>
        <ScrollArea className="flex-1 px-3">
          {mockChatHistory.map((c) => (
            <button
              key={c.id}
              className="mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </ScrollArea>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
              <ModeIcon className="h-3.5 w-3.5" /> {modeInfo[mode].label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                      {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2"><Settings className="h-4 w-4" /> Admin</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await logout(); navigate("/login"); }} className="flex items-center gap-2 cursor-pointer"><LogOut className="h-4 w-4" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Chat area */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <ModeIcon className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">How can I help you?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You're in <span className="font-medium text-primary">{modeInfo[mode].label}</span> mode. Ask me anything.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("mb-4 flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}>
                  {msg.attachment && (
                    <img src={msg.attachment} alt="Attachment" className="max-w-xs rounded-lg object-cover" />
                  )}
                  {msg.role === "user" && msg.fileName && !msg.attachment && (
                    <div className="flex items-center gap-2 bg-background/20 rounded-lg px-3 py-2 text-xs border border-white/10 mb-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[150px]">{msg.fileName}</span>
                      <Badge variant="outline" className="h-4 px-1 text-[9px] bg-white/10 text-white border-white/20">{msg.fileType}</Badge>
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
              <div className="mb-4 flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4 flex flex-col">
          {selectedFile && (
            <div className="mx-auto flex max-w-2xl w-full mb-3 px-1 items-center gap-3">
              {previewUrl ? (
                <div className="relative inline-block">
                  <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover border" />
                  <button
                    onClick={removeFile}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-sm max-w-full">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="truncate font-medium">{selectedFile.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                       {(() => {
                         const ext = selectedFile.name.split('.').pop()?.toUpperCase();
                         const colorMap: Record<string, string> = {
                           PDF: "bg-red-500/10 text-red-500 border-red-500/20",
                           DOCX: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                           DOC: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                           XLSX: "bg-green-500/10 text-green-500 border-green-500/20",
                           XLS: "bg-green-500/10 text-green-500 border-green-500/20",
                           CSV: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                           TXT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
                         };
                         const colors = colorMap[ext || ""] || "bg-primary/10 text-primary border-primary/20";
                         return <Badge variant="outline" className={cn("px-1 py-0 h-4 text-[10px]", colors)}>{ext}</Badge>;
                       })()}
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="ml-auto flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted-foreground/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          
          {errorHeader && (
             <div className="mx-auto flex max-w-2xl w-full mb-2 px-1 text-xs text-destructive items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorHeader}
             </div>
          )}

          <div className="mx-auto flex max-w-2xl w-full items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button size="icon" onClick={sendMessage} disabled={(!input.trim() && !selectedFile) || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-foreground w-full">
            NexusAI may produce inaccurate information. Verify important facts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
