# Blob Manager (SFTP-Client-Service)

A web-based file manager for object storage — browse, preview, and manage files with a
professional tooling UI. First backend: **Vercel Blob**. Auth-gated: nothing is reachable
without signing in.

## Features
- **Browse** folders and files (breadcrumb navigation, folded folder listing)
- **Full CRUD** — upload (multi-file), rename/move, delete (files & folders, bulk), new folder
- **Wide preview support** — images, PDF, video, audio, code (syntax-highlighted), JSON,
  Markdown, **NDJSON as a table**, plain text; download fallback for anything else
- **Auth gate** — env credentials + signed session cookie; middleware blocks every route/API
- **Pluggable storage** — a `StorageProvider` interface; add S3/R2/SFTP without touching the UI

## Configure
Copy `.env.example` → `.env.local` and fill in:

| Var | Purpose |
|---|---|
| `AUTH_USERNAME` / `AUTH_PASSWORD` | Sign-in credentials |
| `AUTH_SECRET` | Session cookie signing (`openssl rand -base64 32`) |
| `STORAGE_PROVIDER` | `vercel-blob` (default) |
| `STORAGE_LABEL` | Connection name shown in the header |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read-write token |

## Run
```bash
npm install
npm run dev      # http://localhost:3000  → redirects to /login
npm run build && npm start
```

## Architecture
- `src/lib/storage/` — `StorageProvider` interface + `vercel-blob` implementation + `getStorage()` factory
- `src/lib/auth.ts` + `src/middleware.ts` — credential check, JWT session, hard route/API gate
- `src/app/api/fs/*` — `list · content · upload · delete · move · mkdir` (all auth-gated)
- `src/components/file-manager.tsx` — the browser UI; `src/components/preview.tsx` — the preview pane

The storage token stays **server-side only**; the browser talks to the app's API, never to the
storage backend directly.
