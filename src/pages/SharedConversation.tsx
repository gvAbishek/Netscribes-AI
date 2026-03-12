import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api";
import { Loader2, Sparkles, MessageSquare, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessage, Conversation } from "@/lib/mock-data";

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ conversation: Conversation, messages: ChatMessage[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/history/shared/${token}`);
        if (!res.ok) {
          throw new Error("Conversation not found or link has expired.");
        }
        const json = await res.json();
        // Backend returns: id, title, created_at, updated_at, share_token, messages[]
        setData({
          conversation: {
            id: json.id,
            title: json.title,
            created_at: json.created_at,
            updated_at: json.updated_at,
            share_token: json.share_token
          },
          messages: (json.messages || []).map((m: any, i: number) => ({
             id: `msg-${i}`,
             role: m.role === "agent" ? "bot" : m.role,
             content: m.content,
             timestamp: new Date(m.timestamp)
          }))
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
         <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
           <MessageSquare className="h-8 w-8 text-destructive" />
         </div>
         <h1 className="text-2xl font-bold">Oops!</h1>
         <p className="mt-2 text-muted-foreground max-w-md">{error}</p>
         <Button asChild className="mt-6">
           <Link to="/">Back to Home</Link>
         </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground tracking-tight">NexusAI</span>
        </div>
        <div className="font-medium text-sm text-foreground truncate max-w-[200px] sm:max-w-md ml-4 mr-auto border px-3 py-1 rounded-md shadow-sm bg-muted/20">
           {data.conversation.title}
        </div>
        <Button variant="default" size="sm" asChild>
          <Link to="/">Start your own</Link>
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {data.messages.length === 0 ? (
            <p className="text-center text-muted-foreground">No messages in this conversation.</p>
          ) : (
            data.messages.map((msg, i) => (
              <div key={i} className={cn("mb-6 flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "bot" && (
                   <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border">
                     <Bot className="h-4 w-4 text-primary" />
                   </div>
                )}
                <div className={cn(
                  "max-w-[85%] flex flex-col gap-1 rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted border text-foreground rounded-bl-sm"
                )}>
                  <div className="whitespace-pre-wrap flex-1">{msg.content}</div>
                  <div className={cn(
                    "text-[10px] opacity-70 mt-2 font-medium tracking-wide",
                    msg.role === "user" ? "text-right" : "text-left"
                  )}>
                    {msg.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
