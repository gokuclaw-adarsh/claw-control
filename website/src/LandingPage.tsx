/**
 * @fileoverview Landing Page for Claw Control
 * 
 * Premium design matching OpenClaw.ai exact structure
 */

import { motion } from 'framer-motion';
import {
  Zap,
  LayoutGrid,
  MessageSquare,
  Bot,
  Users,
  Rocket,
  ArrowRight,
  Github,
  Copy,
  Check,
  Clock,
  BookOpen,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

// ============ Components ============

function CodeBlock({ code, showHeader = true }: { code: string; showHeader?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal rounded-xl overflow-hidden">
      {showHeader && (
        <div className="terminal-header px-4 py-3 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      )}
      <div className="flex items-center justify-between px-5 py-4">
        <code className="text-sm text-gray-300">
          <span className="text-gray-500">$</span> {code}
        </code>
        <button
          onClick={handleCopy}
          className="ml-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      variants={fadeIn}
      className="feature-card p-6 rounded-2xl"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center mb-4">
        <span className="text-[#FF6B6B]">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Testimonial Data
const testimonials = [
  {
    avatar: "🧑‍💻",
    name: "DevOps Engineer",
    handle: "@devops_daily",
    quote: "Finally, a dashboard that lets me see what all my AI agents are doing at once. The real-time updates are chef's kiss 👨‍🍳",
  },
  {
    avatar: "👩‍🔬",
    name: "AI Researcher", 
    handle: "@ai_labs",
    quote: "We use this to coordinate our multi-agent experiments. The kanban workflow is perfect for tracking parallel tasks.",
  },
  {
    avatar: "🚀",
    name: "Indie Hacker",
    handle: "@shipper",
    quote: "Deployed in 2 minutes on Railway. Now I can finally stop asking my agents 'what are you working on?' every 5 minutes.",
  },
];

function TestimonialCard({ avatar, name, handle, quote }: typeof testimonials[0]) {
  return (
    <motion.div 
      variants={fadeIn}
      className="testimonial-card p-6 rounded-2xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{avatar}</div>
        <div>
          <div className="font-semibold text-white">{name}</div>
          <div className="text-sm text-gray-500">{handle}</div>
        </div>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">"{quote}"</p>
    </motion.div>
  );
}

// Integration icons with names
const integrations = [
  { name: "OpenClaw", icon: "🦞" },
  { name: "Railway", icon: "🚂" },
  { name: "Docker", icon: "🐳" },
  { name: "Claude", icon: "🤖" },
  { name: "GPT-4", icon: "✨" },
  { name: "Telegram", icon: "💬" },
  { name: "Discord", icon: "🎮" },
  { name: "Slack", icon: "💼" },
  { name: "GitHub", icon: "🐙" },
  { name: "Vercel", icon: "▲" },
];

function IntegrationBadge({ name, icon }: { name: string; icon: string }) {
  return (
    <motion.div
      variants={fadeIn}
      className="integration-badge px-4 py-3 rounded-xl flex items-center gap-2"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-gray-300 font-medium">{name}</span>
    </motion.div>
  );
}

// ============ Main Landing Page ============

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<'railway' | 'clawhub' | 'git'>('railway');

  const installCommands = {
    railway: 'Click the Deploy button below',
    clawhub: 'npx clawhub install claw-control',
    git: 'git clone https://github.com/adarshmishra07/claw-control',
  };

  return (
    <div className="min-h-screen text-white relative">
      {/* Space Background */}
      <div className="space-bg" />
      <div className="stars" />

      {/* ============ HERO SECTION ============ */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            {/* 1. Lobster Logo */}
            <motion.div 
              className="mb-8"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-7xl sm:text-8xl">🦞</span>
            </motion.div>

            {/* 2. Main Title - Display Font */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold mb-5 tracking-tight">
              <span className="gradient-text">Claw Control</span>
            </h1>
            
            {/* 3. Tagline - Spaced Uppercase */}
            <p className="tagline text-[#FF6B6B] text-sm sm:text-base mb-6">
              Kanban for AI Agents.
            </p>
            
            {/* 4. Description */}
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              A beautiful dashboard to coordinate your AI agent team. 
              Track tasks, monitor status, and watch your agents work in real-time.
            </p>

            {/* 5. NEW Pill Button */}
            <motion.a
              href="https://github.com/adarshmishra07/claw-control"
              target="_blank"
              rel="noopener noreferrer"
              className="pill-button inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="pill-new text-white">NEW</span>
              <span className="text-gray-300 text-sm">Introducing Claw Control</span>
              <ArrowRight className="w-4 h-4 text-[#FF6B6B]" />
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* ============ 6. WHAT PEOPLE SAY ============ */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white">What People Say</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-5"
          >
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ 7. QUICK START ============ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Quick Start</h2>
            <p className="text-gray-500">Get running in under 2 minutes</p>
          </motion.div>

          {/* Tab Selector */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="flex justify-center gap-2 mb-6"
          >
            {[
              { id: 'railway', label: 'Railway' },
              { id: 'clawhub', label: 'ClawHub' },
              { id: 'git', label: 'Git Clone' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Terminal */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            {activeTab === 'railway' ? (
              <div className="text-center">
                <a
                  href="https://railway.com/deploy/_odwJ4?referralCode=VsZvQs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img 
                    src="https://railway.com/button.svg" 
                    alt="Deploy on Railway" 
                    className="h-12 opacity-90 hover:opacity-100 transition-opacity"
                  />
                </a>
                <p className="text-gray-500 text-sm mt-4">One click. No config. Done in 2 minutes.</p>
              </div>
            ) : (
              <div>
                <CodeBlock code={installCommands[activeTab]} />
                {activeTab === 'clawhub' && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    <a href="https://clawhub.ai/adarshmishra07/claw-control" className="text-[#FF6B6B] hover:underline">
                      View on ClawHub →
                    </a>
                  </p>
                )}
                {activeTab === 'git' && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    Then run <code className="text-gray-400">docker-compose up</code> or follow the{' '}
                    <a href="https://github.com/adarshmishra07/claw-control#quick-start" className="text-[#FF6B6B] hover:underline">
                      README →
                    </a>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ============ 8. WHAT IT DOES (Features) ============ */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">What It Does</h2>
            <p className="text-gray-500">Everything you need to coordinate your AI team</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <FeatureCard
              icon={<LayoutGrid className="w-5 h-5" />}
              title="Kanban Board"
              description="Drag-and-drop task management. Backlog → Todo → In Progress → Review → Done."
            />
            <FeatureCard
              icon={<Bot className="w-5 h-5" />}
              title="Agent Tracking"
              description="See which agents are working, idle, or offline. Real-time status updates."
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Live Feed"
              description="Watch agent communications in real-time. Never miss an update."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="SSE Updates"
              description="Instant sync via Server-Sent Events. No refresh needed."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Multi-Agent"
              description="Coordinate entire teams. Assign specialists to different tasks."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Mobile Ready"
              description="Fully responsive. Check on your agents from anywhere."
            />
          </motion.div>
        </div>
      </section>

      {/* ============ 9. WORKS WITH EVERYTHING ============ */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Works With Everything</h2>
            <p className="text-gray-500">Integrate with your existing stack</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-wrap justify-center gap-3"
          >
            {integrations.map((int, i) => (
              <IntegrationBadge key={i} {...int} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ 10. BUILT FOR (replaces Featured In) ============ */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Built For</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid sm:grid-cols-3 gap-4"
          >
            <motion.div variants={fadeIn} className="press-card p-6 rounded-2xl text-center">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="font-semibold text-white mb-1">AI Developers</h3>
              <p className="text-gray-500 text-sm">Building multi-agent systems</p>
            </motion.div>
            <motion.div variants={fadeIn} className="press-card p-6 rounded-2xl text-center">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="font-semibold text-white mb-1">Startups</h3>
              <p className="text-gray-500 text-sm">Running AI-powered workflows</p>
            </motion.div>
            <motion.div variants={fadeIn} className="press-card p-6 rounded-2xl text-center">
              <div className="text-3xl mb-3">🔬</div>
              <h3 className="font-semibold text-white mb-1">Researchers</h3>
              <p className="text-gray-500 text-sm">Coordinating experiments</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ 11. FOOTER BUTTONS ============ */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="flex flex-wrap justify-center gap-4"
          >
            <a
              href="https://github.com/adarshmishra07/claw-control/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 text-white font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              Discussions
            </a>
            <a
              href="https://github.com/adarshmishra07/claw-control/blob/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 text-white font-medium"
            >
              <BookOpen className="w-5 h-5" />
              Documentation
            </a>
            <a
              href="https://github.com/adarshmishra07/claw-control"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 text-white font-medium"
            >
              <Github className="w-5 h-5" />
              GitHub
            </a>
            <a
              href="https://clawhub.ai/adarshmishra07/claw-control"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 text-white font-medium"
            >
              <span className="text-lg">🦞</span>
              ClawHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============ 12. STAY IN THE LOOP ============ */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-2xl font-bold text-white mb-3">Stay in the Loop</h2>
            <p className="text-gray-500 mb-6">Get updates on new features and releases</p>
            
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="you@email.com"
                className="newsletter-input flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-500"
              />
              <button className="btn-primary px-6 py-3 rounded-xl text-white font-semibold">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="gradient-text">Ready to Coordinate?</span>
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Open source, self-hosted, and free forever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://railway.com/deploy/_odwJ4?referralCode=VsZvQs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-8 py-4 rounded-xl flex items-center gap-2 text-white font-semibold text-lg"
              >
                <Rocket className="w-5 h-5" />
                Deploy on Railway
              </a>
              <a
                href="https://github.com/adarshmishra07/claw-control"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-8 py-4 rounded-xl flex items-center gap-2 text-white font-semibold text-lg"
              >
                <Github className="w-5 h-5" />
                Star on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ 13. FOOTER ============ */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦞</span>
              <span className="font-semibold text-white">Claw Control</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <a href="https://github.com/adarshmishra07/claw-control" className="hover:text-[#FF6B6B] transition-colors">GitHub</a>
              <a href="https://clawhub.ai/adarshmishra07/claw-control" className="hover:text-[#FF6B6B] transition-colors">ClawHub</a>
              <a href="https://github.com/adarshmishra07/claw-control/blob/main/docs" className="hover:text-[#FF6B6B] transition-colors">Docs</a>
              <a href="https://github.com/adarshmishra07/claw-control/blob/main/LICENSE" className="hover:text-[#FF6B6B] transition-colors">MIT License</a>
            </div>
          </div>
          <div className="text-center mt-8 text-gray-600 text-sm">
            Built with ❤️ for the AI agent community
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
