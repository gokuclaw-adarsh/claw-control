/**
 * @fileoverview Landing Page for Claw Control
 * 
 * Original Claw Control content with OpenClaw.ai visual theme:
 * - Dark gradient background (#000 → #14080a burgundy)
 * - Coral/red accent colors (#FF6B6B, #EF4444)
 * - Cards with bg-black/40 and subtle borders
 * - Star particles background
 * - Playfair Display serif headings with gradient
 */

import { motion } from 'framer-motion';
import {
  Bot,
  LayoutGrid,
  MessageSquare,
  Clock,
  Globe,
  Shield,
  Workflow,
  Terminal,
  Users,
  Rocket,
  ArrowRight,
  ChevronRight,
  Github,
  Copy,
  Check,
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

// ============ Components ============

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
      className="feature-card group relative p-6 rounded-2xl"
    >
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B6B]/20 to-[#EF4444]/10 flex items-center justify-center mb-4 group-hover:from-[#FF6B6B]/30 group-hover:to-[#EF4444]/20 transition-colors">
          <span className="text-[#FF6B6B]">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
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
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#EF4444] flex items-center justify-center">
        <span className="font-display font-black text-white text-lg">{number}</span>
      </div>
      <div className="flex-1 pb-8 border-l border-[#FF6B6B]/30 pl-6 ml-6 -mt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#FF6B6B]">{icon}</span>
          <h3 className="font-semibold text-white">{title}</h3>
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
    <div className="terminal rounded-xl overflow-hidden">
      <div className="terminal-header px-3 sm:px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27CA3F]" />
        </div>
        <span className="text-xs font-mono text-gray-500">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500 hover:text-[#FF6B6B]" />
          )}
        </button>
      </div>
      <pre className="p-3 sm:p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
        <code className="text-xs sm:text-sm font-mono text-[#FF6B6B] whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

interface LandingPageProps {
  onEnterDashboard?: () => void;
}

export function LandingPage({ onEnterDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      {/* Background */}
      <div className="space-bg" />
      <div className="stars" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="text-2xl">🦞</span>
              <span className="font-display font-bold gradient-text text-lg">
                Claw Control
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <a
                href="https://github.com/adarshmishra07/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5 text-gray-400 hover:text-[#FF6B6B]" />
              </a>
              {onEnterDashboard && (
                <button
                  onClick={onEnterDashboard}
                  className="px-4 py-2 bg-[#FF6B6B]/10 hover:bg-[#FF6B6B]/20 border border-[#FF6B6B]/30 rounded-lg font-medium text-sm text-[#FF6B6B] transition-all hover:border-[#FF6B6B]/50"
                >
                  Dashboard
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            {/* Lobster Logo */}
            <motion.div 
              variants={fadeInUp}
              className="mb-6"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-7xl sm:text-8xl filter drop-shadow-lg">🦞</span>
            </motion.div>

            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              className="pill-button inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            >
              <Sparkles className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-sm font-mono text-[#FF6B6B]">Open Source Mission Control</span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              variants={fadeInUp}
              className="font-display text-5xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tight"
            >
              <span className="text-white">Your AI Agents</span>
              <br />
              <span className="gradient-text">Under Control</span>
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
              {onEnterDashboard ? (
                <button
                  onClick={onEnterDashboard}
                  className="btn-primary group px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
                >
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <a
                  href="https://railway.com/deploy/_odwJ4?referralCode=VsZvQs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary group px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  Deploy on Railway
                </a>
              )}
              <a
                href="https://github.com/adarshmishra07/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
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
                  <div className="text-2xl sm:text-3xl font-display font-bold text-[#FF6B6B]">{stat.value}</div>
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
            className="w-6 h-10 rounded-full border-2 border-[#FF6B6B]/30 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-[#FF6B6B]" />
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
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Everything You Need to
              <span className="gradient-text"> Command Your Agents</span>
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
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="pill-button inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
              <Workflow className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-sm font-mono text-[#FF6B6B]">How It Works</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Get Started in
              <span className="gradient-text"> Minutes</span>
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
            <motion.div variants={fadeInUp} className="pill-button inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
              <Terminal className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-sm font-mono text-[#FF6B6B]">Quick Start</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Ready to
              <span className="gradient-text"> Launch?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-gray-400 max-w-2xl mx-auto">
              Choose your preferred deployment method
            </motion.p>
          </motion.div>

          {/* Deployment Options Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto"
          >
            {/* Option 1: One-Click Deploy */}
            <motion.div
              variants={fadeInUp}
              className="feature-card group relative p-4 sm:p-6 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span className="px-2 py-1 text-xs font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] rounded-full">
                  Fastest
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#FF6B6B]/20 to-[#EF4444]/10 flex items-center justify-center">
                  <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF6B6B]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white">One-Click Deploy</h3>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">Deploy in 2 minutes, no config needed</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6 break-words">
                The easiest way to get started. Click the button below and Railway handles everything for you.
              </p>
              <a
                href="https://railway.com/deploy/_odwJ4?referralCode=VsZvQs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-3 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Deploy on Railway
              </a>
            </motion.div>

            {/* Option 2: Docker Compose */}
            <motion.div
              variants={fadeInUp}
              className="feature-card group relative p-4 sm:p-6 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span className="px-2 py-1 text-xs font-mono bg-blue-500/20 text-blue-400 rounded-full">
                  Recommended
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.185.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338 0-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983 0 1.978-.085 2.955-.253a12.3 12.3 0 003.18-1.028 9.922 9.922 0 002.188-1.518c1.33-1.282 2.122-2.799 2.725-4.087.083 0 .167.003.251.003 1.552 0 2.51-.625 3.04-1.15a3.166 3.166 0 00.768-1.086l.1-.26z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Docker Compose</h3>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">Self-hosted with full control</p>
                </div>
              </div>
              <CodeBlock
                code={`git clone https://github.com/adarshmishra07/claw-control
cd claw-control
docker compose up`}
                language="bash"
              />
            </motion.div>

            {/* Option 3: npm/Manual */}
            <motion.div
              variants={fadeInUp}
              className="feature-card group relative p-4 sm:p-6 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span className="px-2 py-1 text-xs font-mono bg-green-500/20 text-green-400 rounded-full">
                  Development
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                  <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white">npm / Manual</h3>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">For local development</p>
                </div>
              </div>
              <CodeBlock
                code={`git clone https://github.com/adarshmishra07/claw-control
cd claw-control
npm install && npm run dev`}
                language="bash"
              />
            </motion.div>

            {/* Option 4: AI Automation */}
            <motion.div
              variants={fadeInUp}
              className="feature-card group relative p-4 sm:p-6 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span className="px-2 py-1 text-xs font-mono bg-purple-500/20 text-purple-400 rounded-full">
                  AI-Powered
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Full Automation with AI</h3>
                  <p className="text-xs sm:text-sm text-gray-500 break-words">Let your AI agent deploy it for you</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6 break-words">
                Use the Claw Control skill on ClawHub to have your AI agent handle the entire deployment automatically.
              </p>
              <a
                href="https://clawhub.openclaw.ai/skills/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full py-3 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                View on ClawHub
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="relative overflow-hidden rounded-2xl testimonial-card p-8 sm:p-12 lg:p-16"
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B6B]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#EF4444]/10 rounded-full blur-3xl" />

            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#EF4444] flex items-center justify-center"
              >
                <Rocket className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
                Ready to Take
                <span className="gradient-text"> Control?</span>
              </h2>

              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                Join the future of AI agent management. Open source, self-hosted, 
                and built for teams who demand the best.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {onEnterDashboard ? (
                  <button
                    onClick={onEnterDashboard}
                    className="btn-primary group px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
                  >
                    Enter Dashboard
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <a
                    href="https://railway.com/deploy/_odwJ4?referralCode=VsZvQs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary group px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    Deploy Now
                  </a>
                )}
                <a
                  href="https://github.com/adarshmishra07/claw-control"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-8 py-4 rounded-xl font-semibold flex items-center gap-2"
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
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦞</span>
              <span className="font-semibold gradient-text">Claw Control</span>
            </div>
            <div className="text-sm text-gray-500 font-mono">
              Built with love by the OpenClaw community
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/adarshmishra07/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5 text-gray-500 hover:text-[#FF6B6B]" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
