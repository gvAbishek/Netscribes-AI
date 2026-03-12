import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { user, loading, isAdmin, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
      toast.success("Successfully signed in!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-inner">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">NexusAI Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your company knowledge base
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Temporary: No roles needed */}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
          >
            {isLoggingIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Sign in with Google"
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Only authorized administrators can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
