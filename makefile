# Variables
DOCKER_COMPOSE_TEST = docker compose --env-file ./server/.env.test -f docker-compose.test.yml
TEST_SERVICE = backend-test

.PHONY: build
build:
	@echo "🔨 Building test containers..."
	$(DOCKER_COMPOSE_TEST) build

.PHONY: up
up:
	@echo "🚀 Starting test environment..."
	$(DOCKER_COMPOSE_TEST) up -d

.PHONY: test
test:
	@echo "🧪 Running all tests with coverage and reports..."
	@echo "🗑️ Cleaning up old test data..."
	$(DOCKER_COMPOSE_TEST) down -v --remove-orphans 2>/dev/null || true
	$(DOCKER_COMPOSE_TEST) run --rm $(TEST_SERVICE)

.PHONY: logs
logs:
	@echo "📜 Showing logs..."
	$(DOCKER_COMPOSE_TEST) logs -f $(TEST_SERVICE)

.PHONY: down
down:
	@echo "🛑 Stopping and cleaning up test containers..."
	$(DOCKER_COMPOSE_TEST) down -v

.PHONY: test-quick
test-quick:
	@echo "⚡ Running quick health test..."
	$(DOCKER_COMPOSE_TEST) run --rm $(TEST_SERVICE) tests/test_health.py -v -s

.PHONY: test-file
test-file:
	@echo "📝 Running specific test file (usage: make test-file FILE=tests/test_auth.py)..."
	$(DOCKER_COMPOSE_TEST) run --rm $(TEST_SERVICE) $(FILE)

.PHONY: rebuild
rebuild:
	@echo "♻️ Rebuilding and running tests..."
	make down
	make build
	make test
