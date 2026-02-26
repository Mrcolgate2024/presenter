# Presenter — CLAUDE.md

## Quick Reference

| Key | Value |
|-----|-------|
| **Tech** | Vanilla HTML/CSS/JS + Supabase Realtime + Reveal.js (static site) |
| **Repo** | https://github.com/Mrcolgate2024/presenter (`master`) |
| **Deploy** | Vercel (static) — https://presenter-taupe.vercel.app |
| **Supabase** | Project `zfgnjvsnoymsljrznipu` (SKY, eu-west-1) |
| **Local port** | 5555 (port 3000 often occupied) |

## Commands

```bash
npm start    # Express server on port 5555
```

## Architecture

- Static site deployed on Vercel (files in `public/`)
- `server.js` for local dev (Express + file uploads + QR code generation)
- Custom `.deck` format (mood-driven scenes, beats, smart layouts)
- Supabase Realtime Broadcast for audience sync
- Design: Gen-Z glassmorphism, Inter + JetBrains Mono fonts

### Entry Points
- `public/index.html` — Dashboard
- `public/builder.html` — Visual editor
- `public/slides.html` — Presentation viewer
- `public/remote.html` — Mobile remote control
- `public/audience.html` — Audience sync view
- `public/presenter.html` — Speaker notes view

## Development Workflow

### Branch Naming

Use prefixed branches from `master`:
```
feat/description     — New features
fix/description      — Bug fixes
refactor/description — Code restructuring
docs/description     — Documentation
chore/description    — Tooling, config
```

### Pre-Push Review Checklist

Before pushing, Claude Code runs these checks:

1. **Syntax review** — manual review of changed JS/HTML/CSS files
2. **Secret scan** — grep changed files for API keys, tokens, passwords
3. **Diff review** — no `console.log`/`debugger`, no commented-out code
4. **Commit messages** — `type: description` format

### PR Creation Flow

```bash
git checkout -b feat/my-feature
# ... make changes, commit ...
git push -u origin feat/my-feature
gh pr create --title "feat: my feature" --fill
```

### Post-PR Monitoring

After PR creation, Claude Code will:
1. Wait for CI (server start verification) to complete
2. Report pass/fail
3. Merge when green: `gh pr merge --squash --delete-branch`

## CI Workflows

| Workflow | Trigger |
|----------|---------|
| CI (Server Start) | Push to `master`, PRs |
