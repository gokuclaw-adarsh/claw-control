/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable colors (with coral accent #FF6B6B)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // OpenClaw coral accents (use sparingly!)
          primary: '#FF6B6B',
          bright: '#FF4444',
          muted: '#9CA3AF',  // Grey for descriptions, not red!
          secondary: '#A1A1AA', // Zinc-400 grey
          tertiary: '#71717A', // Zinc-500 grey
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#22c55e', // Green for completed
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // OpenClaw Design System
        claw: {
          bg: '#0A0A0A',
          surface: '#1A1A1A',
          card: '#1A1A1A',
          border: '#2A2A2A',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#E0E0E0',
          muted: '#9CA3AF',
          disabled: '#6B7280',
        },
        cyber: {
          black: '#0A0A0A',
          dark: '#141414',
          green: '#22c55e',  // Restored green for success/completed
          blue: '#3b82f6',   // Restored blue
          pink: '#FF8080',
          yellow: '#f59e0b',
          red: '#ef4444',
          purple: '#a855f7',
          orange: '#f97316',
          coral: '#FF6B6B',  // OpenClaw accent
          grid: 'rgba(255, 107, 107, 0.05)',
        },
      },
      fontFamily: {
        heading: ['DM Sans', 'system-ui', 'sans-serif'],
        body: ['Fragment Mono', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Fragment Mono', 'JetBrains Mono', 'monospace'],
        display: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'card': '12px',
        'button': '8px',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glow-coral': 'radial-gradient(ellipse at 50% 0%, rgba(255, 107, 107, 0.15) 0%, transparent 50%)',
        'glow-red': 'radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.15) 0%, transparent 50%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(255, 107, 107, 0.2)',
        'glow-md': '0 0 20px rgba(255, 107, 107, 0.3)',
        'glow-lg': '0 0 30px rgba(255, 107, 107, 0.4)',
        'glow-coral': '0 0 20px rgba(255, 107, 107, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
