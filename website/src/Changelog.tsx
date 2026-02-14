/**
 * @fileoverview Changelog Page for Claw Control
 * 
 * Displays version history and feature updates matching
 * the OpenClaw.ai visual theme.
 */

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Github,
  Calendar,
  MessageSquare,
  LayoutGrid,
  Eye,
  Server,
  User,
  Sparkles,
  GitCommit,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface ChangelogEntry {
  date: string;
  version?: string;
  title: string;
  changes: {
    icon: React.ReactNode;
    title: string;
    description: string;
    tag?: 'feature' | 'improvement' | 'fix' | 'backend';
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    date: '2026-02-14',
    version: 'v1.3.0',
    title: "Valentine's Day Release 💕",
    changes: [
      {
        icon: <MessageSquare className="w-5 h-5" />,
        title: 'Chat Pagination',
        description: 'Agent feed now lazy loads 40 messages at a time with smooth infinite scroll. No more performance issues with long chat histories.',
        tag: 'feature',
      },
      {
        icon: <LayoutGrid className="w-5 h-5" />,
        title: 'Kanban Completed Infinite Scroll',
        description: 'The "Done" column now supports infinite scroll for completed tasks. View your entire task history without pagination clicks.',
        tag: 'feature',
      },
      {
        icon: <Eye className="w-5 h-5" />,
        title: 'TaskDetailModal',
        description: 'New modal for viewing detailed task information. Click any task card to see full description, history, and agent assignments.',
        tag: 'feature',
      },
      {
        icon: <Server className="w-5 h-5" />,
        title: 'Backend Limit/Offset Params',
        description: 'API endpoints now support limit and offset parameters for efficient pagination across all data endpoints.',
        tag: 'backend',
      },
      {
        icon: <User className="w-5 h-5" />,
        title: 'FaceHash Avatars',
        description: 'Agent avatars now use FaceHash for unique, deterministic face generation. Each agent gets a distinct, memorable avatar.',
        tag: 'improvement',
      },
    ],
  },
];

function getTagStyles(tag?: string) {
  switch (tag) {
    case 'feature':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'improvement':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'fix':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'backend':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#EF4444] -translate-x-1/2 ring-4 ring-black" />
      
      {/* Content */}
      <div className="ml-8 pb-12">
        {/* Date and version header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-[#FF6B6B]">
            <Calendar className="w-4 h-4" />
            <span className="font-mono text-sm">{entry.date}</span>
          </div>
          {entry.version && (
            <span className="px-2 py-1 text-xs font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] rounded-full border border-[#FF6B6B]/30">
              {entry.version}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-6">
          {entry.title}
        </h3>
        
        {/* Changes grid */}
        <div className="grid gap-4">
          {entry.changes.map((change, idx) => (
            <motion.div
              key={idx}
              variants={fadeInUp}
              className="feature-card p-4 sm:p-5 rounded-xl group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B6B]/20 to-[#EF4444]/10 flex items-center justify-center text-[#FF6B6B] group-hover:from-[#FF6B6B]/30 group-hover:to-[#EF4444]/20 transition-colors">
                  {change.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="font-semibold text-white">{change.title}</h4>
                    {change.tag && (
                      <span className={`px-2 py-0.5 text-xs font-mono rounded border ${getTagStyles(change.tag)}`}>
                        {change.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {change.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Changelog() {
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
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="text-2xl">🦞</span>
                <span className="font-display font-bold gradient-text text-lg">
                  Claw Control
                </span>
              </Link>
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
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Back link */}
            <motion.div variants={fadeInUp} className="mb-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FF6B6B] transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </motion.div>

            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              className="pill-button inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            >
              <GitCommit className="w-4 h-4 text-[#FF6B6B]" />
              <span className="text-sm font-mono text-[#FF6B6B]">What's New</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl sm:text-5xl font-black mb-4"
            >
              <span className="gradient-text">Changelog</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-400 max-w-2xl leading-relaxed"
            >
              All the latest updates, features, and improvements to Claw Control. 
              Stay up to date with what's new in your AI agent command center.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Changelog Timeline */}
      <section className="relative pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative border-l-2 border-[#FF6B6B]/30 ml-2"
          >
            {changelog.map((entry, idx) => (
              <ChangelogEntryCard key={idx} entry={entry} />
            ))}
          </motion.div>

          {/* More coming soon */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="inline-flex items-center gap-2 text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-mono">More updates coming soon...</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl">🦞</span>
              <span className="font-semibold gradient-text">Claw Control</span>
            </Link>
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

export default Changelog;
