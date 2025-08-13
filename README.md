# Orasan - Time Tracking App

> **Orasan** is a Filipino word for "clock" - a time-tracking application designed for freelancers and professionals to manage their projects and track time efficiently.

## Features

- 🕐 **Time Tracking**: Track time spent on tasks with start/stop functionality
- 📁 **Project Management**: Organize tasks within projects
- 🔒 **Privacy First**: Row-level security with Supabase
- 📱 **Offline Capable**: Works without internet, syncs when connection is restored
- 💰 **Subscription Ready**: Built-in support for free/pro/enterprise tiers
- 🎨 **Modern UI**: Built with shadcn/ui and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Git Hooks**: Lefthook for pre-commit checks

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL (local development)
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd orasan-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. Set up the database:
   ```bash
   # Create local database
   createdb orasan_dev
   
   # Run the schema (you'll need to do this in Supabase for production)
   psql -d orasan_dev -f database/schema.sql
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── projects/       # Project-related components
│   ├── time-tracking/  # Time tracking components
│   └── auth/           # Authentication components
├── lib/                 # Utility functions and configurations
│   └── supabase/       # Supabase client configurations
├── types/               # TypeScript type definitions
└── hooks/               # Custom React hooks
```

## Database Schema

The app uses PostgreSQL with the following main tables:
- `users` - User profiles and subscription information
- `projects` - Project definitions with client and rate information
- `tasks` - Tasks within projects
- `time_entries` - Individual time tracking records

All tables have Row Level Security (RLS) enabled for data privacy.

## Development

### Git Hooks

This project uses Lefthook for pre-commit hooks:
- Linting with ESLint
- Type checking with TypeScript

### Code Style

- ESLint configuration follows Next.js recommendations
- TypeScript strict mode enabled
- Prettier formatting (if configured)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] User authentication and profile management
- [ ] Project and task CRUD operations
- [ ] Time tracking with start/stop functionality
- [ ] Offline support with IndexedDB
- [ ] Data synchronization
- [ ] Dashboard with time analytics
- [ ] Subscription management
- [ ] Client billing features
- [ ] Export functionality (CSV, PDF reports)
- [ ] Mobile responsive design
- [ ] Dark mode support
