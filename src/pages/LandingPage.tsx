import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun, Bot, Brain, FileSearch, Zap, Shield, Users, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const LandingPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Netscribes AI Chatbot</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(168_80%_36%/0.08),transparent_60%)]" />
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Zap className="h-3 w-3" /> Internal AI Platform
            </span>
          </motion.div>
          <motion.h1
            className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Your Company's <span className="text-gradient">Intelligent</span> Assistant
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            A unified AI platform for direct conversations, autonomous actions, and knowledge retrieval — built for your team.
          </motion.p>
          <motion.div className="mt-8 flex items-center justify-center gap-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Link to="/signup">
              <Button size="lg" className="gap-2">Get Started <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Log in</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Three Powerful Modes</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Choose the right AI approach for every task.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Bot, title: "Direct LLM", desc: "Chat directly with a large language model for brainstorming, writing, and analysis." },
              { icon: Brain, title: "Agent Mode", desc: "An AI agent that reasons, plans, and takes actions across your company's tools and systems." },
              { icon: FileSearch, title: "RAG Mode", desc: "Retrieves answers from internal documents using Retrieval Augmented Generation for accurate, sourced responses." },
            ].map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <Card className="group relative overflow-hidden border bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Built for Your Organization</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            NexusAI is an internal company AI assistant designed for knowledge management and workflow automation. 
            Your data stays secure, your teams stay productive, and your AI stays aligned with company policies.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Team-first</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Enterprise secure</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-primary" /> Lightning fast</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">NexusAI</span>
          </div>
          <div className="flex gap-6">
            <span>Privacy</span><span>Terms</span><span>Documentation</span><span>Support</span>
          </div>
          <span>© 2026 NexusAI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
