# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project ARK (Academic Record Keeper)** is a multi-tenant web application for digitally managing academic records for schools and colleges. This repo is the frontend. The project is in early development — the codebase is a freshly scaffolded Vite + React + TypeScript app with Bootstrap.

The full BRD is in `ark_brd_doc.txt` (in the parent directory).

## Tech Stack

- **React 19** with TypeScript (strict mode)
- **Vite 7** with SWC (`@vitejs/plugin-react-swc`) for Fast Refresh
- **Bootstrap 5** (CSS imported in `src/main.tsx`)
- **ESLint 9** flat config with `typescript-eslint`, `react-hooks`, and `react-refresh` plugins

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check with `tsc -b` then build with Vite |
| `npm run lint` | Run ESLint across the project |
| `npm run preview` | Preview the production build locally |

## Architecture

- `src/main.tsx` — App entry point, renders `<App />` inside `<StrictMode>`, imports Bootstrap CSS
- `src/App.tsx` — Root component (currently default Vite template)
- `vite.config.ts` — Vite config with SWC React plugin
- `eslint.config.js` — Flat ESLint config, targets `**/*.{ts,tsx}`, ignores `dist/`
- `tsconfig.json` — Project references setup splitting app (`tsconfig.app.json`) and node (`tsconfig.node.json`)

## TypeScript Configuration

- Target: ES2022, strict mode enabled
- `noUnusedLocals` and `noUnusedParameters` are enforced
- `verbatimModuleSyntax` is enabled — use `import type` for type-only imports
- `erasableSyntaxOnly` is enabled — avoid enums and parameter properties

## Key Domain Concepts (from BRD)

- **Multi-tenancy**: Each organization has isolated data; no cross-org access
- **4-tier RBAC**: Super Admin > Org Admin > Admin > User
- **Core domains**: Organization management, user/role management, authentication, academic records (students, faculty, courses, grades, attendance), search & reporting
