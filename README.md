# LandGuard AI — Frontend

React + TypeScript dashboard for the LandGuard AI land transaction verification system.

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 6
- **Language**: TypeScript 5
- **Icons**: Lucide React
- **State**: React Hooks (useState, useEffect)

## Quick Start

### 1. Install Dependencies

```powershell
cd frontend
npm install
```

### 2. Start Development Server

```powershell
npm run dev
```

The app will be available at **http://localhost:3000**

### 3. Build for Production

```powershell
npm run build
```

## Project Structure

```
landguard-ai-frontend/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main application
│   │   ├── main.tsx          # Entry point
│   │   └── styles.css        # Design system
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@landguard.local | AdminPass123! |
| Officer | officer@landguard.local | OfficerPass123! |
| Auditor | auditor@landguard.local | AuditorPass123! |

## Docker

```powershell
docker build -t landguard-frontend .
docker run -p 3000:3000 landguard-frontend
```
