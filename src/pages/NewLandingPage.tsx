import { Link } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun, Bot, Brain, FileSearch, ArrowRight, Shield, Zap, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.8, ease: "easeOut" } }),
};

const NewLandingPage = () => {
  const { theme, toggleTheme } = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] dark:bg-blue-600/20" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] dark:bg-purple-600/20" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6 md:px-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-medium tracking-tight">NexusAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Link to="/login" className="hidden sm:block">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</span>
            </Link>
            <Link to="/signup">
              <Button className="rounded-full px-6 font-medium shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-16">
        {/* Hero Section */}
        <motion.section 
          ref={heroRef}
          style={{ opacity, scale }}
          className="relative flex flex-col items-center justify-center min-h-[90vh] px-6 text-center"
        >
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium backdrop-blur-md mb-8 hover:bg-muted transition-colors cursor-pointer">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Introducing Nexus Enterprise
            </div>
          </motion.div>
          
          <motion.h1
            className="max-w-4xl text-5xl font-medium tracking-tighter sm:text-7xl md:text-8xl leading-[1.1]"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Intelligence, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
              multiplied.
            </span>
          </motion.h1>
          
          <motion.p
            className="mt-8 max-w-2xl text-lg sm:text-xl text-muted-foreground font-light leading-relaxed"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            A unified AI platform for direct conversations, autonomous actions, and deep knowledge retrieval. Engineered for modern teams.
          </motion.p>
          
          <motion.div className="mt-12 flex flex-col sm:flex-row items-center gap-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <Link to="/signup">
              <Button size="lg" className="rounded-full px-8 h-14 text-base font-medium gap-2 group shadow-sm transition-all text-white bg-blue-600 hover:bg-blue-700 dark:bg-white dark:text-black dark:hover:bg-white/90">
                Start building <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-medium border-border hover:bg-accent backdrop-blur-md transition-all">
                Talk to Sales
              </Button>
            </Link>
          </motion.div>
        </motion.section>

        {/* Bento Box Features Section */}
        <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="mb-20 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-4">Powerful primitives.</h2>
            <p className="text-xl text-muted-foreground font-light">Choose the right cognitive architecture for your task.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 md:p-12 hover:bg-card/80 transition-colors"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-opacity">
                <Brain className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end min-h-[300px]">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-medium mb-3">Agent Mode</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                  Deploy autonomous agents that reason, plan, and execute multi-step workflows across your company's internal tools and APIs.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 md:p-10 hover:bg-card/80 transition-colors"
            >
              <div className="relative z-10 h-full flex flex-col justify-between min-h-[300px]">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-medium mb-3">Direct LLM</h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Unfiltered access to frontier models for rapid brainstorming, coding, and deep analysis without systemic overhead.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card/40 p-8 md:p-10 hover:bg-card/80 transition-colors"
            >
              <div className="relative z-10 h-full flex flex-col justify-between min-h-[300px]">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <FileSearch className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-medium mb-3">Instant RAG</h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Retrieve answers instantly from your internal documentation. Fully semantic search grounded in your private data.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Feature 4 (Full Width) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card/40 to-muted/20 p-8 md:p-12"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.1),transparent_50%)]" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                    <Shield className="h-3 w-3" /> Enterprise Grade
                  </div>
                  <h3 className="text-3xl font-medium mb-3">Secure by Design</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                    SOC2 compliant, zero-data retention policies, and granular RBAC. Your models learn from your data, but your data never leaves your VPC.
                  </p>
                </div>
                <div className="flex gap-4 self-start md:self-center">
                  <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border/50">
                    <Lock className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <span className="text-xs text-muted-foreground">SOC 2 Type II</span>
                  </div>
                  <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border/50">
                    <Zap className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <span className="text-xs text-muted-foreground">Low Latency</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-background/80 backdrop-blur-lg pt-16 pb-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground">
                <Sparkles className="h-3 w-3 text-background" />
              </div>
              <span className="font-medium text-foreground">NexusAI</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">
              Next-generation cognitive architecture for enterprise teams.
            </p>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Research</a>
            <a href="#" className="hover:text-foreground transition-colors">Company</a>
            <a href="#" className="hover:text-foreground transition-colors">Safety</a>
            <a href="#" className="hover:text-foreground transition-colors">Careers</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© 2026 NexusAI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewLandingPage;
