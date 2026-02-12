# Omegle Staff Application Portal

A professional, world-class staff application portal built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern, clean UI with Discord-inspired theme
- 📱 Fully responsive design
- ✨ Smooth animations and transitions
- 📋 Comprehensive application form with validation
- 🔍 Scenario-based and critical thinking questions
- ♿ Accessible and user-friendly

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Pages

- **/** - Main landing page with "Coming Soon" message
- **/staff-application** - Complete staff application form

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Fonts:** Inter (Google Fonts)

## Form Features

### Application Sections

1. **Basic Information**
   - Country
   - Available time
   - Age
   - Personal introduction

2. **Moderation Understanding**
   - Definition of moderation
   - Previous experience

3. **Practical Requirements**
   - Voice chat capability
   - Service commitment length
   - Discord bot familiarity

4. **Scenario-Based Assessment**
   - Ethical dilemmas
   - Conflict resolution
   - Content moderation decisions

5. **Critical Thinking & Logic**
   - Priority management
   - Pattern recognition
   - Analytical reasoning

### Form Validation

- Required field validation
- Minimum character requirements
- Real-time error feedback
- Smooth scroll to errors

## Customization

You can customize the colors, content, and form fields by editing:

- `tailwind.config.js` - Theme colors and styling
- `app/staff-application/page.tsx` - Form fields and questions
- `app/globals.css` - Global styles

## Deployment

Build for production:

```bash
npm run build
npm start
```

## License

© 2026 Omegle Discord Community. All rights reserved.
