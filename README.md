# Firewall Manager

A production-grade web control plane for Linux iptables. Manage firewall rules through a modern UI — rules are applied **atomically** to the kernel using `iptables-restore`. No shell commands are ever constructed from user input.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + TypeScript + TailwindCSS)             │
│  - Rules table with sorting, filtering, drag reorder    │
│  - Apply / Rollback buttons → REST API only             │
│  - NEVER executes system commands                       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS REST + Bearer Auth
┌──────────────────────────▼──────────────────────────────┐
│  Go Backend (Gin)                                       │
│  handlers → service → FirewallDriver interface          │
│  - Input validated against allowlists                   │
│  - Builds iptables-save format in memory                │
│  - Pipes to iptables-restore (no shell, no injection)   │
│  - Snapshots to SQLite for rollback                     │
└──────────────────────────┬──────────────────────────────┘
                           │ exec.Command (no shell)
┌──────────────────────────▼──────────────────────────────┐
│  Linux Kernel iptables                                  │
│  /sbin/iptables-save / /sbin/iptables-restore           │
└─────────────────────────────────────────────────────────┘
```

### Why `iptables-restore` only?

Applying rules one-by-one with `iptables -A/-D` is not atomic — a crash mid-apply leaves the firewall in a broken state. `iptables-restore` replaces the entire ruleset in a single kernel transaction.

## Project Layout

```
firewall-manager/
├── backend/
│   ├── cmd/server/
│   │   ├── main.go          # Wiring, graceful shutdown
│   │   └── config.go        # Env-based config
│   └── internal/
│       ├── api/
│       │   ├── handlers/    # Thin HTTP handlers — no business logic
│       │   └── middleware/  # Auth, logging
│       ├── firewall/
│       │   ├── driver.go    # FirewallDriver interface
│       │   └── iptables.go  # IptablesDriver — exec, sanitize, build
│       ├── models/          # Rule, Counter, HistoryEntry structs
│       ├── repository/      # SQLite rule + history repos
│       └── service/         # Business logic, validation, orchestration
├── frontend/
│   └── src/
│       ├── components/      # Modal, RuleForm, ActionBadge, Sidebar
│       ├── hooks/           # useRules, useCounters
│       ├── pages/           # Dashboard, RulesPage, CountersPage, Settings
│       ├── services/        # api.ts — all endpoints typed
│       └── types/           # TypeScript types
├── deploy/
│   ├── firewall-manager.service  # systemd unit
│   └── env.production            # Production env template
├── Dockerfile               # Multi-stage: Node → Go → debian-slim
├── docker-compose.yml
└── Makefile
```

## Quick Start (Development)

### Prerequisites

- Go 1.22+
- Node 20+
- Linux with `iptables` installed (or skip apply for dev)
- `gcc` (for CGO SQLite driver)

### 1. Clone and initialize

```bash
git clone <repo>
cd firewall-manager
make init          # copies .env.example → .env files
make deps          # installs frontend npm packages
```

### 2. Start backend

```bash
make run
# Backend: http://localhost:8080
```

### 3. Start frontend (separate terminal)

```bash
make frontend-dev
# UI: http://localhost:5173
```

> The Vite dev server proxies `/api/*` to the Go backend.

## API Reference

All endpoints require `Authorization: Bearer <API_KEY>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/rules` | List all rules |
| `POST` | `/api/rules` | Create a rule |
| `PUT` | `/api/rules/:id` | Update a rule |
| `DELETE` | `/api/rules/:id` | Delete a rule |
| `POST` | `/api/apply` | Atomically apply all enabled rules to kernel |
| `POST` | `/api/rollback` | Restore previous iptables snapshot |
| `GET` | `/api/counters` | Get live packet/byte counters |

### Example: Create a rule

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Authorization: Bearer dev-insecure-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "INPUT",
    "protocol": "tcp",
    "src": "",
    "dst": "",
    "srcPort": "",
    "dstPort": "22",
    "action": "ACCEPT",
    "enabled": true,
    "comment": "Allow SSH",
    "position": 0
  }'
```

### Example: Apply rules to kernel

```bash
curl -X POST http://localhost:8080/api/apply \
  -H "Authorization: Bearer dev-insecure-key-change-in-production"
```

## Production Deployment

### Docker

```bash
# Build
docker build -t firewall-manager:latest .

# Run (NET_ADMIN required for iptables)
docker run -d \
  --name firewall-manager \
  --network host \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  -e API_KEY="$(openssl rand -hex 32)" \
  -e ENV=production \
  -v fw-data:/opt/firewall-manager/data \
  firewall-manager:latest
```

### systemd (bare metal / VM)

```bash
# 1. Build
make build

# 2. Install binary
sudo install -m 755 dist/firewall-manager /opt/firewall-manager/firewall-manager

# 3. Create data dir
sudo mkdir -p /var/lib/firewall-manager
sudo mkdir -p /etc/firewall-manager

# 4. Configure
sudo cp deploy/env.production /etc/firewall-manager/env
sudo chmod 600 /etc/firewall-manager/env
# Edit /etc/firewall-manager/env — set API_KEY, ALLOWED_ORIGINS

# 5. Install and start service
sudo cp deploy/firewall-manager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now firewall-manager

# 6. Check status
sudo systemctl status firewall-manager
sudo journalctl -u firewall-manager -f
```

## Security Notes

| Concern | Mitigation |
|---------|-----------|
| Command injection | All values are allowlist-validated before reaching `exec.Command`. No shell (`sh -c`) is ever used. |
| Raw iptables exposure | The Rule struct uses abstract fields (`chain`, `action`, etc.). Frontend never sends raw iptables syntax. |
| Authentication | Bearer token middleware. Replace with JWT or mTLS for production. |
| Atomic apply | `iptables-restore` replaces ruleset in a single kernel call — no partial state. |
| Rollback | `iptables-save` snapshot is stored before every apply. `POST /api/rollback` restores it. |
| SQLite WAL | WAL mode enabled for concurrent reads without blocking writes. |

## Build for production

```bash
make build
# Outputs: dist/firewall-manager (binary) + dist/static/ (frontend)
```

## Running tests

```bash
make test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listen port |
| `ENV` | `development` | `development` or `production` |
| `DB_PATH` | `./firewall.db` | SQLite database path |
| `API_KEY` | (insecure default) | Bearer token for API auth |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins (comma-separated) |

Frontend (`VITE_` prefix):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_KEY` | (insecure default) | API key sent in Authorization header |










============================================================================================================================

installation commands

# Ubuntu/Debian
sudo apt update
sudo apt install -y golang-go gcc libsqlite3-dev nodejs npm iptables

# Verify versions
go version        # needs 1.22+
node --version    # needs 20+
npm --version
iptables --version








# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Download Go modules
cd backend && go mod tidy && cd ..# fwmg
