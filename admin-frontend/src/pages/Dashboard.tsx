import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  FileText, Users, Settings, LogOut, Sparkles, Upload, 
  Trash2, Moon, Sun, Search, Plus, ExternalLink,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";

type Tab = "documents" | "users" | "settings";

interface AdminDocument {
  id: string;
  name: string;
  description: string;
  status: "processing" | "indexed" | "error";
  uploadedAt: string;
  uploadedBy: string;
  allowedRoles: string[];
  blobUrl: string;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const token = user ? await user.getIdToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const res = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const [uploadForm, setUploadForm] = useState({
    description: "",
    allowedRoles: [] as string[],
    file: null as File | null
  });

  const roles = ["admin", "finance", "engineering", "user"];

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/documents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(documents.filter(doc => doc.id !== id));
        toast.success("Document deleted");
      }
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error("Please select a file");
      return;
    }

    setIsLoading(true);
    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("description", uploadForm.description);
      formData.append("allowedRoles", JSON.stringify(uploadForm.allowedRoles));

      const res = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        toast.success("Upload successful! Pipeline is running in background.");
        setIsUploadModalOpen(false);
        setUploadForm({ description: "", allowedRoles: [], file: null });
        fetchDocuments();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: AdminDocument["status"] }) => {
    switch (status) {
      case "indexed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" /> Indexed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="h-3 w-3 animate-pulse" /> Processing
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="h-3 w-3" /> Error
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">NexusAI</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab("documents")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "documents" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            <FileText className="h-4 w-4" /> Documents
          </button>
          <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "users" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            <Users className="h-4 w-4" /> Users
          </button>
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "settings" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </nav>

        <div className="p-4 border-t space-y-2">
          <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all">
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search..." className="bg-accent border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary w-64" />
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-blue-400 border-2 border-background shadow-md"></div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">Manage and monitor documents used for RAG.</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Upload Document
                </button>
              </div>

              <div className="grid gap-4">
                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-20 bg-card border rounded-xl border-dashed">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents found. Start by uploading one.</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="group bg-card border rounded-xl p-4 hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate pr-4">{doc.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.description}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-3">
                              <StatusBadge status={doc.status} />
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                <Users className="h-3 w-3" /> {doc.allowedRoles.join(", ")}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={doc.blobUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title="View Source">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-card border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Assign roles and manage access permissions.</p>
              </div>
              <div className="divide-y">
                {[
                  { name: "John Doe", email: "john@company.com", role: "admin", status: "active" },
                  { name: "Jane Smith", email: "jane@company.com", role: "engineering", status: "active" },
                  { name: "Mike Ross", email: "mike@company.com", role: "user", status: "inactive" }
                ].map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-bold text-primary">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <select className="bg-accent border-none text-xs rounded-lg px-2 py-1 font-medium focus:ring-2 focus:ring-primary outline-none" defaultValue={u.role}>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className={`text-xs font-bold uppercase tracking-widest ${u.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {u.status}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "RAG Mode", description: "Enable document-grounded generation for all users.", active: true },
                  { label: "Agent Capability", description: "Allow AI to use internet search and other tools.", active: true },
                  { label: "Public Access", description: "Allow non-registered users to view landing page.", active: false }
                ].map((s, i) => (
                  <div key={i} className="bg-card border rounded-xl p-5 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4">
                       <div className={`h-2 w-2 rounded-full ${s.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted'}`}></div>
                    </div>
                    <div>
                      <h4 className="font-semibold">{s.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">System Setting</span>
                      <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.active ? 'bg-primary' : 'bg-muted'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold">Upload Knowledge</h3>
            <p className="text-sm text-muted-foreground mt-1">Upload files to augment the AI with your company's proprietary data.</p>
            
            <form onSubmit={handleUpload} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Select File</label>
                <div className="relative border-2 border-dashed rounded-xl p-8 transition-colors hover:border-primary/50 flex flex-col items-center justify-center bg-accent/50">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-center">
                    <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, or PPTX (max 20MB)</p>
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".pdf,.docx,.pptx"
                    onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                  />
                  {uploadForm.file && (
                    <div className="mt-4 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full flex items-center gap-2">
                      <FileText className="h-3 w-3" /> {uploadForm.file.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-loose">Description</label>
                <textarea 
                  className="w-full bg-accent border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary h-24 resize-none"
                  placeholder="What is this document about?"
                  required
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-loose">Access Control (Roles)</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        const newRoles = uploadForm.allowedRoles.includes(role)
                          ? uploadForm.allowedRoles.filter(r => r !== role)
                          : [...uploadForm.allowedRoles, role];
                        setUploadForm({...uploadForm, allowedRoles: newRoles});
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        uploadForm.allowedRoles.includes(role)
                          ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border font-semibold hover:bg-accent transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Start Pipeline</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
