import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "768px",
        md: "1024px",
        lg: "1360px",
        xl: "1560px",
      },
    },
    extend: {
      fontFamily: {
        mono: ['var(--font-proto-mono)', 'Courier New', 'monospace'],
        sans: ['var(--font-proto-mono)', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // Blur.io inspired color system
        blur: {
          bg: {
            primary: '#080404',
            secondary: '#1e1e1e',
            tertiary: '#2a2a2a',
          },
          text: {
            primary: '#d9d9d9',
            secondary: '#c1c1c1',
            muted: '#808080',
          },
          orange: {
            DEFAULT: '#ff8700',
            bright: '#f95200',
            glow: 'rgba(255, 135, 0, 0.3)',
          },
          yellow: '#f6ae2d',
          green: '#ade25d',
          red: '#ff4444',
        },
        // Keep shadcn compatibility
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
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xl2': '48px',
        'xl3': '64px',
        'xl4': '96px',
        'xl5': '128px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        blur: "4px",
      },
      backdropBlur: {
        blur: '10px',
      },
      boxShadow: {
        'blur-glow': '0 0 20px rgba(255, 135, 0, 0.3)',
        'blur-card': '0 10px 30px rgba(0, 0, 0, 0.2)',
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
        "glow": {
          "0%, 100%": { textShadow: "0 0 10px rgba(255, 135, 0, 0.5)" },
          "50%": { textShadow: "0 0 20px rgba(255, 135, 0, 0.8)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow": "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
