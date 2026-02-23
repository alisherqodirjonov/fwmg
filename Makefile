.PHONY: all build run test clean docker-build frontend backend dev

BINARY := firewall-manager
BUILD_DIR := ./dist
BACKEND_DIR := ./backend
FRONTEND_DIR := ./frontend

all: build

# Build both frontend and backend into a single deployable directory
build: frontend-build backend-build

backend-build:
	@echo "→ Building backend..."
	@mkdir -p $(BUILD_DIR)
	cd $(BACKEND_DIR) && CGO_ENABLED=1 go build -ldflags="-s -w" -o ../$(BUILD_DIR)/$(BINARY) ./cmd/server
	@echo "✓ Backend binary: $(BUILD_DIR)/$(BINARY)"

frontend-build:
	@echo "→ Building frontend..."
	cd $(FRONTEND_DIR) && npm ci && npm run build
	@cp -r $(FRONTEND_DIR)/dist $(BUILD_DIR)/static
	@echo "✓ Frontend assets: $(BUILD_DIR)/static"

# Run backend in development mode (requires .env)
run:
	@[ -f $(BACKEND_DIR)/.env ] || cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env
	cd $(BACKEND_DIR) && go run ./cmd/server

# Run frontend dev server (proxies API to localhost:8080)
frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev

# Run both in parallel (requires tmux or separate terminals)
dev:
	@echo "Start two terminals:"
	@echo "  Terminal 1: make run"
	@echo "  Terminal 2: make frontend-dev"

test:
	cd $(BACKEND_DIR) && go test ./... -race -count=1

lint:
	cd $(BACKEND_DIR) && go vet ./...
	cd $(FRONTEND_DIR) && npm run lint

clean:
	rm -rf $(BUILD_DIR)
	cd $(FRONTEND_DIR) && rm -rf dist node_modules

docker-build:
	docker build -t firewall-manager:latest .

# Install frontend deps
deps:
	cd $(FRONTEND_DIR) && npm ci

# Initialize .env files from examples
init:
	@[ -f $(BACKEND_DIR)/.env ] || cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env && echo "Created backend/.env"
	@[ -f $(FRONTEND_DIR)/.env ] || cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env && echo "Created frontend/.env"