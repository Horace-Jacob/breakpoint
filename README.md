# Breakpoint

A pre-execution rule engine for AI agents.

Validate payloads, enforce policies, score risk, and log every decision before execution.

## Prerequisites

- Bun
- Node.js
- Supabase CLI

## Installation

```bash
bun install
```

## Environment setup

Copy `.env.example` to `apps/web/.env.local`.

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anon key.
- `SUPABASE_PROJECT_ID`: Your Supabase project ID for generated database types.
- `NEXT_PUBLIC_SITE_URL`: Local site URL (default `http://localhost:3000`).

## Running locally

```bash
bun run dev
```

## Generating Supabase types

```bash
bun run db:types
```

## Workspace structure

- `apps/web`: Next.js App Router frontend.
- `packages/ui`: Shared UI package.
- `packages/lib`: Shared Supabase, auth helpers, schemas, and DB types.

## Future prompts

- Prompt 2: Auth and middleware
- Prompt 3: Dashboard shell and sidebar
- Prompt 4: Rule engine API and trace logging