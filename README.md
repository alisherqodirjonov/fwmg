# Firewall Manager

A web-based control panel for managing Linux `iptables` firewall rules. Instead of typing iptables commands manually, you manage everything through a modern web UI. Rules are applied **atomically** using `iptables-restore` — the entire ruleset is replaced in one kernel transaction, so your firewall is never left in a broken half-applied state.

## Features

- **Rule Management** — Create, edit, delete, reorder, and enable/disable firewall rules through the web UI
- **NAT Support** — Configure SNAT (source NAT) and DNAT (destination NAT) rules
- **Atomic Apply** — All rules are applied at once via `iptables-restore`, never one-by-one
- **Rollback** — Every apply saves a snapshot; one click restores the previous state
- **Live Counters** — Real-time packet and byte counters from iptables, displayed as charts
- **Interface & Zone Management** — Organize network interfaces into zones for easier rule writing
- **IP Forwarding** — Toggle kernel IP forwarding from the settings page
- **Authentication** — Bearer token protects all API endpoints
- **No Command Injection** — User input is allowlist-validated; no shell (`sh -c`) is ever used

## Architecture

```
Browser (React + TypeScript + TailwindCSS)
    |
    | HTTPS + Bearer Token
    v
Go Backend (Gin)
    |  handlers -> service -> FirewallDriver interface
    |  - Input validated against allowlists
    |  - Builds iptables-save format in memory
    |  - Pipes to iptables-restore (no shell)
    |  - Snapshots to SQLite for rollback
    v
Linux Kernel (iptables)
    /sbin/iptables-save  /  /sbin/iptables-restore
```

## Project Layout

```
firewall-manager/
├── backend/
│   ├── cmd/server/          # Entry point (main.go) and config loader
│   └── internal/
│       ├── api/handlers/    # HTTP handlers (thin layer, no business logic)
│       ├── api/middleware/   # Auth (bearer token) and request logging
│       ├── firewall/        # FirewallDriver interface + iptables implementation
│       ├── models/          # Data structures: Rule, Config, Counters, NATRule, etc.
│       ├── network/         # Network interface discovery (netlink + mock driver)
│       ├── repository/      # SQLite repositories (rules, history, config, zones, NAT)
│       └── service/         # Business logic, validation, orchestration, rollback
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI: modals, forms, charts, sidebar
│       ├── hooks/           # React hooks for data fetching (useRules, useCounters)
│       ├── pages/           # Dashboard, Rules, Interfaces, Settings
│       ├── services/        # Typed API client (axios)
│       └── types/           # TypeScript interfaces
├── deploy/
│   ├── firewall-manager.service   # systemd unit file
│   └── env.production             # Production environment template
├── Dockerfile               # Multi-stage build: Node -> Go -> debian-slim
├── docker-compose.yml
└── Makefile                 # Build automation
```

---

## Installation Guide

### Prerequisites

| Software     | Minimum Version | Purpose                              |
|-------------|-----------------|--------------------------------------|
| Go          | 1.22+           | Backend language                     |
| Node.js     | 20+             | Frontend build toolchain             |
| npm         | (comes with Node) | Package manager for frontend       |
| gcc         | any             | Required by CGO for SQLite driver    |
| libsqlite3-dev | any          | SQLite C library headers             |
| iptables    | any             | Linux firewall (the thing we manage) |
| Linux       | kernel 3.13+    | Required OS (iptables is Linux-only) |

### Step 1 — Install system dependencies

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y golang-go gcc libsqlite3-dev nodejs npm iptables
```

**Fedora / RHEL / CentOS:**

```bash
sudo dnf install -y golang gcc sqlite-devel nodejs npm iptables
```

**Arch Linux:**

```bash
sudo pacman -S go gcc sqlite nodejs npm iptables
```

Verify installations:

```bash
go version          # should show 1.22 or higher
node --version      # should show v20 or higher
npm --version
iptables --version
gcc --version
```

> **Note:** If your distro ships an older Go version (e.g., Ubuntu 22.04 ships Go 1.18), install Go manually from [go.dev/dl](https://go.dev/dl/). Similarly for Node.js — use [NodeSource](https://github.com/nodesource/distributions) or [nvm](https://github.com/nvm-sh/nvm) if needed.

### Step 2 — Clone the repository

```bash
git clone <your-repo-url>
cd firewall-manager
```

### Step 3 — Set up environment files

```bash
make init
```

This copies `.env.example` to `.env` in both `backend/` and `frontend/`. Then edit them:

**backend/.env:**

```env
PORT=8080
ENV=development
DB_PATH=./firewall.db
API_KEY=your-secret-api-key-here
ALLOWED_ORIGINS=http://localhost:5173
```

**frontend/.env:**

```env
VITE_API_KEY=your-secret-api-key-here
```

> **Important:** The `API_KEY` in backend and `VITE_API_KEY` in frontend must match. This is the bearer token used for authentication.

### Step 4 — Install dependencies

```bash
# Frontend npm packages
make deps

# Go modules (downloaded automatically on first build/run, but you can do it explicitly)
cd backend && go mod download && cd ..
```

### Step 5 — Run in development mode

You need **two terminals**:

**Terminal 1 — Backend:**

```bash
make run
# Starts the Go server on http://localhost:8080
```

**Terminal 2 — Frontend:**

```bash
make frontend-dev
# Starts Vite dev server on http://localhost:5173
# Proxies /api/* requests to the backend automatically
```

Open **http://localhost:5173** in your browser.

> **Note:** The backend requires root privileges (or `CAP_NET_ADMIN`) to actually apply iptables rules. During development you can run it without root — you'll be able to create and manage rules in the database, but applying them to the kernel will fail. To apply rules, run with `sudo`:
> ```bash
> cd backend && sudo go run ./cmd/server
> ```

---

## Production Deployment

### Option A — Docker (recommended)

```bash
# Build the image
docker build -t firewall-manager:latest .

# Run (NET_ADMIN capability is required for iptables)
docker run -d \
  --name firewall-manager \
  --network host \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  -e API_KEY="$(openssl rand -hex 32)" \
  -e ENV=production \
  -e ALLOWED_ORIGINS="https://your-domain.com" \
  -v fw-data:/opt/firewall-manager/data \
  firewall-manager:latest
```

The container:
- Builds both frontend and backend in a multi-stage Dockerfile
- Serves the frontend from the same binary (no separate web server needed)
- Stores the SQLite database in `/opt/firewall-manager/data/` (persisted via volume)
- Listens on port `8080` by default

### Option B — systemd (bare metal / VM)

```bash
# 1. Build the production binary + frontend assets
make build
# Output: dist/firewall-manager (binary) + dist/static/ (frontend)

# 2. Install the binary
sudo mkdir -p /opt/firewall-manager
sudo install -m 755 dist/firewall-manager /opt/firewall-manager/firewall-manager
sudo cp -r dist/static /opt/firewall-manager/static

# 3. Create data directory
sudo mkdir -p /var/lib/firewall-manager

# 4. Set up the environment file
sudo mkdir -p /etc/firewall-manager
sudo cp deploy/env.production /etc/firewall-manager/env
sudo chmod 600 /etc/firewall-manager/env
# Edit /etc/firewall-manager/env — set API_KEY, ALLOWED_ORIGINS, etc.

# 5. Install and start the systemd service
sudo cp deploy/firewall-manager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now firewall-manager

# 6. Verify it's running
sudo systemctl status firewall-manager
sudo journalctl -u firewall-manager -f
```

---

## API Reference

All endpoints except `/api/health` require the `Authorization: Bearer <API_KEY>` header.

### Rules (filter/firewall rules)

| Method   | Endpoint          | Description              |
|----------|-------------------|--------------------------|
| `GET`    | `/api/rules`      | List all rules           |
| `POST`   | `/api/rules`      | Create a new rule        |
| `PUT`    | `/api/rules/:id`  | Update a rule by ID      |
| `DELETE` | `/api/rules/:id`  | Delete a rule by ID      |

### NAT Rules

| Method   | Endpoint              | Description              |
|----------|-----------------------|--------------------------|
| `GET`    | `/api/nat-rules`      | List all NAT rules       |
| `POST`   | `/api/nat-rules`      | Create a new NAT rule    |
| `PUT`    | `/api/nat-rules/:id`  | Update a NAT rule by ID  |
| `DELETE` | `/api/nat-rules/:id`  | Delete a NAT rule by ID  |

### Interfaces

| Method   | Endpoint               | Description                  |
|----------|------------------------|------------------------------|
| `GET`    | `/api/interfaces`      | List all network interfaces  |
| `POST`   | `/api/interfaces`      | Add an interface             |
| `PUT`    | `/api/interfaces/:id`  | Update an interface          |
| `DELETE` | `/api/interfaces/:id`  | Delete an interface          |

### Zones

| Method   | Endpoint          | Description         |
|----------|-------------------|---------------------|
| `GET`    | `/api/zones`      | List all zones      |
| `POST`   | `/api/zones`      | Create a zone       |
| `PUT`    | `/api/zones/:id`  | Update a zone       |
| `DELETE` | `/api/zones/:id`  | Delete a zone       |

### Configuration

| Method | Endpoint       | Description                                      |
|--------|----------------|--------------------------------------------------|
| `GET`  | `/api/config`  | Get current config (IP forwarding, NAT enabled)  |
| `POST` | `/api/config`  | Update config settings                           |

### Firewall Operations

| Method | Endpoint       | Description                                       |
|--------|----------------|---------------------------------------------------|
| `POST` | `/api/apply`   | Apply all enabled rules to the kernel atomically  |
| `POST` | `/api/rollback` | Restore the previous iptables snapshot           |

### Counters & Monitoring

| Method | Endpoint                          | Description                            |
|--------|-----------------------------------|----------------------------------------|
| `GET`  | `/api/counters`                   | Get live packet/byte counters          |
| `GET`  | `/api/counters/interfaces`        | List interfaces with traffic stats     |
| `GET`  | `/api/counters/aggregate`         | Get aggregated counter data            |
| `GET`  | `/api/counters/interfaces/:iface` | Get counters for a specific interface  |

### Health

| Method | Endpoint       | Description                    |
|--------|----------------|--------------------------------|
| `GET`  | `/api/health`  | Health check (no auth needed)  |

### Example: Create a firewall rule

```bash
curl -X POST http://localhost:8080/api/rules \
  -H "Authorization: Bearer <your-api-key>" \
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

### Example: Apply rules to the kernel

```bash
curl -X POST http://localhost:8080/api/apply \
  -H "Authorization: Bearer <your-api-key>"
```

---

## Environment Variables

### Backend

| Variable          | Default                  | Description                                |
|-------------------|--------------------------|--------------------------------------------|
| `PORT`            | `8080`                   | HTTP listen port                           |
| `ENV`             | `development`            | `development` or `production`              |
| `DB_PATH`         | `./firewall.db`          | Path to the SQLite database file           |
| `API_KEY`         | (insecure dev default)   | Bearer token for API authentication        |
| `ALLOWED_ORIGINS` | `http://localhost:5173`  | CORS allowed origins (comma-separated)     |
| `FRONTEND_PATH`   | `../frontend/dist`       | Path to built frontend assets              |
| `USE_MOCK_DRIVER` | (unset)                  | Set to `true` to use mock network driver   |

### Frontend

| Variable       | Default                | Description                              |
|----------------|------------------------|------------------------------------------|
| `VITE_API_KEY` | (insecure dev default) | API key sent in the Authorization header |

---

## Make Commands

| Command            | Description                                        |
|--------------------|----------------------------------------------------|
| `make init`        | Copy `.env.example` files to `.env`                |
| `make deps`        | Install frontend npm dependencies                  |
| `make run`         | Start the backend in development mode              |
| `make frontend-dev`| Start the Vite dev server (frontend)               |
| `make build`       | Build production binary + frontend assets to `dist/`|
| `make test`        | Run backend tests with race detector               |
| `make lint`        | Run Go vet and ESLint                              |
| `make clean`       | Remove build artifacts and node_modules            |
| `make docker-build`| Build the Docker image                             |

---

## Security Notes

| Concern              | How it's handled                                                                                  |
|----------------------|---------------------------------------------------------------------------------------------------|
| Command injection    | All values are allowlist-validated before reaching `exec.Command`. No shell (`sh -c`) is ever used. |
| Raw iptables access  | The Rule struct uses abstract fields (`chain`, `action`, etc.). The frontend never sends raw iptables syntax. |
| Authentication       | Bearer token middleware on all `/api/*` endpoints (except health check).                          |
| Atomic apply         | `iptables-restore` replaces the entire ruleset in a single kernel call — no partial state.        |
| Rollback             | `iptables-save` captures a snapshot before every apply. `POST /api/rollback` restores it.         |
| Database             | SQLite with WAL mode for concurrent reads without blocking writes.                                |

---

## Tech Stack

**Backend:** Go 1.22, Gin, SQLite (mattn/go-sqlite3), Logrus, Netlink  
**Frontend:** React 18, TypeScript, Vite, TailwindCSS, Recharts, ReactFlow, dnd-kit  
**Deployment:** Docker (multi-stage), systemd
