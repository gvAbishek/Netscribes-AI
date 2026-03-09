import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import {
  Moon, Sun, Sparkles, FileText, Users, Settings, Upload, Trash2,
  ArrowLeft, Bot, Brain, FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockDocuments, mockUsers, AdminDocument, AdminUser } from "@/lib/mock-data";

const AdminDashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const [documents, setDocuments] = useState<AdminDocument[]>(mockDocuments);
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [settings, setSettings] = useState({ llm: true, agent: true, rag: true });

  const deleteDoc = (id: string) => setDocuments((d) => d.filter((x) => x.id !== id));
  const toggleUser = (id: string) =>
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, status: x.status === "active" ? "disabled" as const : "active" as const } : x)));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">NexusAI</span>
            <Badge variant="secondary" className="text-[10px]">Admin</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      <div className="container mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage documents, users, and system settings.</p>

        <Tabs defaultValue="documents" className="mt-6">
          <TabsList>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          </TabsList>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Document Management</CardTitle>
                  <CardDescription>Manage RAG knowledge base documents</CardDescription>
                </div>
                <Button className="gap-2"><Upload className="h-4 w-4" /> Upload</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.uploadedBy}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.uploadedAt}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Management</CardTitle>
                <CardDescription>Enable or disable user access</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                        <TableCell>
                          <Switch checked={user.status === "active"} onCheckedChange={() => toggleUser(user.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { key: "llm" as const, icon: Bot, title: "Direct LLM", desc: "Enable direct LLM conversations" },
                { key: "agent" as const, icon: Brain, title: "Agent Mode", desc: "Enable AI agent with tool use" },
                { key: "rag" as const, icon: FileSearch, title: "RAG Mode", desc: "Enable document retrieval" },
              ].map((s) => (
                <Card key={s.key}>
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                    <Switch
                      checked={settings[s.key]}
                      onCheckedChange={(v) => setSettings((p) => ({ ...p, [s.key]: v }))}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
