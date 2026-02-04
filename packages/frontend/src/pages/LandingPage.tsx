/**
 * @fileoverview Landing Page for Claw Control
 * 
 * A stunning landing page matching OpenClaw website theme with:
 * - Dark theme with gradients
 * - Lucide icons (no emojis)
 * - Clean typography
 * - Subtle animations via Framer Motion
 * - Mobile responsive design
 * 
 * Sections: Hero, Features, How it Works, Quick Start, CTA
 * 
 * @module pages/LandingPage
 */

import { motion } from 'framer-motion';
import {
  Radio,
  Zap,
  Bot,
  LayoutGrid,
  MessageSquare,
  Terminal,
  Workflow,
  Users,
  Shield,
  Rocket,
  ArrowRight,
  ChevronRight,
  Github,
  Copy,
  Check,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="group relative p-6 rounded-xl bg-gradient-to-b from-cyber-green/5 to-transparent border border-cyber-green/20 hover:border-cyber-green/40 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-green/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-lg bg-cyber-green/10 flex items-center justify-center mb-4 group-hover:bg-cyber-green/20 transition-colors">
          <span className="text-cyber-green">{icon}</span>
        </div>
        <h3 className="text-lg font-display font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function StepCard({ number, title, description, icon }: StepCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className="relative flex items-start gap-4"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyber-green to-cyber-blue flex items-center justify-center">
        <span className="font-display font-black text-black text-lg">{number}</span>
      </div>
      <div className="flex-1 pb-8 border-l border-cyber-green/30 pl-6 ml-6 -mt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-cyber-green">{icon}</span>
          <h3 className="font-display font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-green/50 to-cyber-blue/50 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />
      <div className="relative bg-black/80 rounded-lg border border-cyber-green/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-cyber-green/20 bg-cyber-green/5">
          <span className="text-xs font-mono text-cyber-green/70">{language}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-cyber-green/10 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-cyber-green" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500 hover:text-cyber-green" />
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-cyber-green">{code}</code>
        </pre>
      </div>
    </div>
  );
}

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export function LandingPage({ onEnterDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-cyber-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cyber-black/80 border-b border-cyber-green/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Radio className="w-6 h-6 text-cyber-green" />
              <span className="font-display font-black italic tracking-widest text-cyber-green uppercase text-lg">
                Claw Control
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <a
                href="https://github.com/gokuclaw-adarsh/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-cyber-green/10 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5 text-gray-400 hover:text-cyber-green" />
              </a>
              <button
                onClick={onEnterDashboard}
                className="px-4 py-2 bg-cyber-green/10 hover:bg-cyber-green/20 border border-cyber-green/30 rounded-lg font-display text-sm uppercase tracking-wider text-cyber-green transition-all hover:border-cyber-green/50"
              >
                Dashboard
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-green/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-blue/10 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0, 255, 65, 0.1) 1px, transparent 1px),
                             linear-gradient(to bottom, rgba(0, 255, 65, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-green/10 border border-cyber-green/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-cyber-green" />
              <span className="text-sm font-mono text-cyber-green">Open Source Mission Control</span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black mb-6"
            >
              <span className="text-white">Your AI Agents</span>
              <br />
              <span className="bg-gradient-to-r from-cyber-green via-cyber-blue to-cyber-green bg-clip-text text-transparent">
                Under Control
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              A beautiful, real-time dashboard to manage your AI agent workforce. 
              Monitor tasks, track progress, and coordinate your autonomous team 
              with military precision.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={onEnterDashboard}
                className="group relative px-8 py-4 bg-cyber-green text-black font-display font-bold uppercase tracking-wider rounded-lg overflow-hidden transition-all hover:shadow-neon-green"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <a
                href="https://github.com/gokuclaw-adarsh/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="group px-8 py-4 bg-transparent border border-cyber-green/30 hover:border-cyber-green/60 text-cyber-green font-display font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { value: '100%', label: 'Open Source' },
                { value: 'Real-time', label: 'Updates' },
                { value: 'Mobile', label: 'Responsive' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-cyber-green">{stat.value}</div>
                  <div className="text-sm text-gray-500 font-mono">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-cyber-green/30 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-cyber-green" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-blue/10 border border-cyber-blue/30 mb-6">
              <Zap className="w-4 h-4 text-cyber-blue" />
              <span className="text-sm font-mono text-cyber-blue">Powerful Features</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Everything You Need to
              <span className="text-cyber-green"> Command Your Agents</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-400 max-w-2xl mx-auto">
              Built with modern tech stack for maximum performance and developer experience
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="Agent Management"
              description="Monitor and manage all your AI agents in one place. See who's working, who's idle, and what everyone's up to."
              delay={0}
            />
            <FeatureCard
              icon={<LayoutGrid className="w-6 h-6" />}
              title="Kanban Board"
              description="Drag-and-drop task management with real-time updates. Organize work across backlog, in progress, review, and done."
              delay={0.1}
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Live Agent Feed"
              description="Real-time stream of agent communications and status updates. Stay informed about everything happening in your system."
              delay={0.2}
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Real-time Sync"
              description="Server-sent events (SSE) keep your dashboard perfectly in sync. Changes appear instantly, no refresh needed."
              delay={0.3}
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Mobile First"
              description="Fully responsive design that works beautifully on any device. Manage your agents from anywhere."
              delay={0.4}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Open Source"
              description="MIT licensed and fully transparent. Fork it, customize it, make it yours. Contributions welcome!"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative py-24 sm:py-32 bg-gradient-to-b from-transparent via-cyber-green/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-purple/10 border border-cyber-purple/30 mb-6">
              <Workflow className="w-4 h-4 text-cyber-purple" />
              <span className="text-sm font-mono text-cyber-purple">How It Works</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Get Started in
              <span className="text-cyber-green"> Minutes</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-400 max-w-2xl mx-auto">
              Three simple steps to have your mission control center up and running
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-2xl mx-auto"
          >
            <StepCard
              number="1"
              title="Clone the Repository"
              description="Fork and clone Claw Control from GitHub. It's open source and ready to customize."
              icon={<Github className="w-5 h-5" />}
            />
            <StepCard
              number="2"
              title="Configure & Deploy"
              description="Set up your environment variables and deploy with Docker. Works locally or in the cloud."
              icon={<Terminal className="w-5 h-5" />}
            />
            <StepCard
              number="3"
              title="Connect Your Agents"
              description="Point your AI agents to the Mission Control API. They'll start reporting in automatically."
              icon={<Users className="w-5 h-5" />}
            />
          </motion.div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30 mb-6">
              <Terminal className="w-4 h-4 text-cyber-yellow" />
              <span className="text-sm font-mono text-cyber-yellow">Quick Start</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Ready to
              <span className="text-cyber-green"> Launch?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-400 max-w-2xl mx-auto">
              Get Claw Control running with these simple commands
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="max-w-3xl mx-auto space-y-6"
          >
            <CodeBlock
              code={`# Clone the repository
git clone https://github.com/gokuclaw-adarsh/claw-control.git
cd claw-control`}
              language="bash"
            />
            <CodeBlock
              code={`# Start with Docker Compose
docker compose up -d`}
              language="bash"
            />
            <CodeBlock
              code={`# Or run locally
npm install
npm run dev`}
              language="bash"
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-green/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyber-green/20 via-cyber-blue/10 to-cyber-purple/20 border border-cyber-green/30 p-8 sm:p-12 lg:p-16"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyber-green/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyber-blue/20 rounded-full blur-3xl" />

            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-cyber-green to-cyber-blue flex items-center justify-center"
              >
                <Rocket className="w-10 h-10 text-black" />
              </motion.div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
                Ready to Take
                <span className="text-cyber-green"> Control?</span>
              </h2>

              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                Join the future of AI agent management. Open source, self-hosted, 
                and built for teams who demand the best.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onEnterDashboard}
                  className="group px-8 py-4 bg-cyber-green text-black font-display font-bold uppercase tracking-wider rounded-lg transition-all hover:shadow-neon-green flex items-center gap-2"
                >
                  Enter Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="https://github.com/gokuclaw-adarsh/claw-control"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-transparent border border-white/20 hover:border-white/40 text-white font-display font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  <Github className="w-5 h-5" />
                  Star on GitHub
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyber-green/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-cyber-green" />
              <span className="font-display font-bold text-cyber-green uppercase tracking-wider text-sm">
                Claw Control
              </span>
            </div>
            <div className="text-sm text-gray-500 font-mono">
              Built with love by the OpenClaw community
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/gokuclaw-adarsh/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-cyber-green/10 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5 text-gray-500 hover:text-cyber-green" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
