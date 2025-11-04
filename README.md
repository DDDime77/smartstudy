# StudySmart AI - Landing Page

A beautiful, minimalistic landing page for the AI Study Planner project built with Next.js, TypeScript, and Tailwind CSS.

## 🎨 Design Philosophy

- **Minimalistic**: Black and white color scheme with subtle gradients
- **Modern**: Glassmorphism effects, smooth animations, and micro-interactions
- **Responsive**: Mobile-first design that works on all devices
- **Accessible**: Semantic HTML and proper ARIA labels

## ✨ Features

### Implemented Components

1. **Landing Page** (`app/page.tsx`)
   - Hero section with animated text
   - Features showcase with glassmorphism cards
   - How it works section with step-by-step guide
   - Technical details section
   - Call-to-action sections
   - Footer with navigation links

2. **Reusable Components**
   - `AnimatedText`: Text animations (fade, slide, typewriter, glitch)
   - `Button`: Primary, secondary, and ghost variants with hover effects
   - `GlassCard`: Glassmorphism card with hover glow effects
   - `GridBackground`: Animated background with gradient orbs and grid pattern
   - `LoginModal`: Full-featured login/signup modal (UI only, no backend)

3. **Features Highlighted**
   - Adaptive Learning
   - Smart Prioritization
   - Optimal Time Slots
   - Progress Tracking
   - Spaced Repetition
   - Goal Management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
ai-study-planner/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles and animations
├── components/
│   ├── AnimatedText.tsx    # Text animation component
│   ├── Button.tsx          # Button component with variants
│   ├── GlassCard.tsx       # Glassmorphism card component
│   ├── GridBackground.tsx  # Animated background
│   └── LoginModal.tsx      # Login/signup modal
├── public/                 # Static assets
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎨 Design System

### Colors

- **Primary Background**: `#000000` (Black)
- **Primary Foreground**: `#FFFFFF` (White)
- **Glass Effect**: `rgba(255, 255, 255, 0.05)` with backdrop blur

### Animations

- `fade-in`: Smooth opacity transition
- `slide-up`: Slide from bottom with fade
- `glow`: Pulsing glow effect
- `pulse-glow`: Background orb animation
- `float`: Floating animation for decorative elements

### Components

#### Button Variants
- **Primary**: White background, black text, hover glow
- **Secondary**: Transparent with white border, inverts on hover
- **Ghost**: Minimal, text-only with subtle hover

#### Card Effects
- **Glass Effect**: Semi-transparent with backdrop blur
- **Hover Glow**: Subtle shadow and lift on hover
- **Smooth Transitions**: 300ms for all interactions

## 🔧 Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Font**: Inter (Google Fonts)
- **Build Tool**: Turbopack (Next.js 16 default)

## ✅ Quality Checks

### TypeScript Compilation
```bash
npx tsc --noEmit
```
✅ No type errors

### Development Server
```bash
npm run dev
```
✅ Running on http://localhost:3000

### Features Verified
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Smooth animations and transitions
- ✅ Login modal functionality (UI only)
- ✅ Navigation links and scroll behavior
- ✅ Glassmorphism effects
- ✅ Background animations
- ✅ All components render correctly
- ✅ No console errors
- ✅ TypeScript strict mode enabled

## 🎯 Next Steps

### Backend Integration (Not Yet Implemented)
1. User authentication system
2. Database setup (PostgreSQL recommended)
3. API endpoints for:
   - User registration/login
   - Task management
   - Study session tracking
   - ML predictions

### Additional Pages (To Be Created)
1. Dashboard page
2. Task management page
3. Study session timer page
4. Analytics/insights page
5. Settings page

## 📝 Notes

- Login functionality is UI-only; clicking "Sign In" or "Sign Up" shows an alert
- All navigation links are placeholder links (scroll to sections or "#")
- Social login buttons (Google, GitHub) are UI-only
- Backend logic will be implemented in subsequent phases

## 🐛 Known Issues

None at the moment! All TypeScript errors have been resolved and the application runs smoothly.

## 📄 License

This project is built for the RIT Dubai Engineering Competition.

---

Built with ❤️ for the AI Study Planner Competition
