# ──────────────────────────────────────────
# Stage 1: Build frontend
# ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ──────────────────────────────────────────
# Stage 2: Build backend
# ──────────────────────────────────────────
FROM golang:1.22-bookworm AS backend-builder
WORKDIR /app/backend

# Install sqlite3 build deps (CGO required for go-sqlite3)
RUN apt-get update && apt-get install -y gcc libc-dev libsqlite3-dev && rm -rf /var/lib/apt/lists/*

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o /firewall-manager \
    ./cmd/server

# ──────────────────────────────────────────
# Stage 3: Runtime image
# ──────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

# iptables tooling
RUN apt-get update && apt-get install -y \
    iptables \
    iproute2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root service user (NOTE: iptables still requires CAP_NET_ADMIN)
RUN groupadd -r fwmgr && useradd -r -g fwmgr -s /sbin/nologin fwmgr

WORKDIR /opt/firewall-manager
COPY --from=backend-builder /firewall-manager ./firewall-manager
COPY --from=frontend-builder /app/frontend/dist ./static

RUN chown -R fwmgr:fwmgr /opt/firewall-manager

EXPOSE 8080

# Requires --cap-add=NET_ADMIN when running
USER fwmgr

ENV ENV=production
ENV PORT=8080
ENV DB_PATH=/opt/firewall-manager/data/firewall.db

VOLUME ["/opt/firewall-manager/data"]

ENTRYPOINT ["./firewall-manager"]