# Makefile برای مدیریت پروژه POS SDK 7220
# Makefile for POS SDK 7220 Project Management

.PHONY: help install build test clean docs lint security-audit deploy install-pos test-hardware backup update

# متغیرهای پیکربندی
PROJECT_NAME = pos-sdk-7220
VERSION = 1.0.0
NODE_ENV = development
BUILD_DIR = dist
SCRIPTS_DIR = scripts
EXAMPLES_DIR = examples
CONFIG_DIR = config

# رنگ‌ها برای نمایش بهتر
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

# دستور پیش‌فرض
.DEFAULT_GOAL := help

help: ## نمایش راهنمای دستورات
	@echo "$(BLUE)================================$(NC)"
	@echo "$(BLUE) راهنمای دستورات POS SDK 7220$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@echo ""
	@echo "$(GREEN)دستورات اصلی:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)مثال استفاده:$(NC)"
	@echo "  make install        # نصب وابستگی‌ها"
	@echo "  make build         # ساخت پروژه"
	@echo "  make test          # اجرای تست‌ها"
	@echo "  make deploy        # استقرار روی دستگاه POS"

install: ## نصب وابستگی‌های پروژه
	@echo "$(GREEN)نصب وابستگی‌های پروژه...$(NC)"
	npm install
	@echo "$(GREEN)وابستگی‌ها با موفقیت نصب شدند$(NC)"

install-prod: ## نصب وابستگی‌های تولید
	@echo "$(GREEN)نصب وابستگی‌های تولید...$(NC)"
	npm ci --only=production
	@echo "$(GREEN)وابستگی‌های تولید نصب شدند$(NC)"

build: ## ساخت پروژه
	@echo "$(GREEN)ساخت پروژه...$(NC)"
	@if [ -f "webpack.config.js" ]; then \
		npm run build; \
	else \
		echo "$(YELLOW)Webpack config یافت نشد، کپی کردن فایل‌ها...$(NC)"; \
		mkdir -p $(BUILD_DIR); \
		cp -r src/* $(BUILD_DIR)/; \
		cp package.json $(BUILD_DIR)/; \
		cp -r config/* $(BUILD_DIR)/; \
	fi
	@echo "$(GREEN)پروژه با موفقیت ساخته شد$(NC)"

test: ## اجرای تست‌ها
	@echo "$(GREEN)اجرای تست‌ها...$(NC)"
	@if [ -f "jest.config.js" ] || [ -f "package.json" ]; then \
		npm test; \
	else \
		echo "$(YELLOW)Jest config یافت نشد، تست‌ها اجرا نمی‌شوند$(NC)"; \
	fi

test-watch: ## اجرای تست‌ها در حالت نظارت
	@echo "$(GREEN)اجرای تست‌ها در حالت نظارت...$(NC)"
	@if [ -f "jest.config.js" ] || [ -f "package.json" ]; then \
		npm run test:watch; \
	else \
		echo "$(YELLOW)Jest config یافت نشد$(NC)"; \
	fi

lint: ## بررسی کیفیت کد
	@echo "$(GREEN)بررسی کیفیت کد...$(NC)"
	@if [ -f ".eslintrc.js" ] || [ -f "package.json" ]; then \
		npm run lint; \
	else \
		echo "$(YELLOW)ESLint config یافت نشد$(NC)"; \
	fi

lint-fix: ## رفع خودکار مشکلات کد
	@echo "$(GREEN)رفع خودکار مشکلات کد...$(NC)"
	@if [ -f ".eslintrc.js" ] || [ -f "package.json" ]; then \
		npm run lint:fix; \
	else \
		echo "$(YELLOW)ESLint config یافت نشد$(NC)"; \
	fi

security-audit: ## بررسی امنیت پروژه
	@echo "$(GREEN)بررسی امنیت پروژه...$(NC)"
	npm audit
	@echo "$(GREEN)بررسی امنیت تکمیل شد$(NC)"

security-fix: ## رفع خودکار مشکلات امنیتی
	@echo "$(GREEN)رفع خودکار مشکلات امنیتی...$(NC)"
	npm audit fix
	@echo "$(GREEN)مشکلات امنیتی رفع شدند$(NC)"

docs: ## تولید مستندات
	@echo "$(GREEN)تولید مستندات...$(NC)"
	@if [ -f "jsdoc.json" ] || [ -f "package.json" ]; then \
		npm run docs; \
	else \
		echo "$(YELLOW)JSDoc config یافت نشد$(NC)"; \
	fi

clean: ## پاک کردن فایل‌های موقت
	@echo "$(GREEN)پاک کردن فایل‌های موقت...$(NC)"
	rm -rf $(BUILD_DIR)
	rm -rf node_modules
	rm -rf coverage
	rm -rf .nyc_output
	rm -rf logs
	rm -rf tmp
	@echo "$(GREEN)فایل‌های موقت پاک شدند$(NC)"

clean-logs: ## پاک کردن فایل‌های لاگ
	@echo "$(GREEN)پاک کردن فایل‌های لاگ...$(NC)"
	rm -rf logs/*
	rm -rf tmp/*
	@echo "$(GREEN)فایل‌های لاگ پاک شدند$(NC)"

dev: ## راه‌اندازی در حالت توسعه
	@echo "$(GREEN)راه‌اندازی در حالت توسعه...$(NC)"
	@if [ -f "package.json" ]; then \
		npm run dev; \
	else \
		echo "$(RED)package.json یافت نشد$(NC)"; \
	fi

start: ## راه‌اندازی در حالت تولید
	@echo "$(GREEN)راه‌اندازی در حالت تولید...$(NC)"
	@if [ -f "package.json" ]; then \
		npm start; \
	else \
		echo "$(RED)package.json یافت نشد$(NC)"; \
	fi

# دستورات مربوط به دستگاه POS
install-pos: ## نصب برنامه روی دستگاه POS
	@echo "$(GREEN)نصب برنامه روی دستگاه POS...$(NC)"
	@if [ -f "$(SCRIPTS_DIR)/install-pos-app.sh" ]; then \
		chmod +x $(SCRIPTS_DIR)/install-pos-app.sh; \
		$(SCRIPTS_DIR)/install-pos-app.sh; \
	else \
		echo "$(RED)اسکریپت نصب یافت نشد$(NC)"; \
	fi

test-hardware: ## تست سخت‌افزار دستگاه POS
	@echo "$(GREEN)تست سخت‌افزار دستگاه POS...$(NC)"
	@if [ -f "$(SCRIPTS_DIR)/hardware-test.sh" ]; then \
		chmod +x $(SCRIPTS_DIR)/hardware-test.sh; \
		$(SCRIPTS_DIR)/hardware-test.sh; \
	else \
		echo "$(RED)اسکریپت تست سخت‌افزار یافت نشد$(NC)"; \
	fi

backup: ## پشتیبان‌گیری از پروژه
	@echo "$(GREEN)پشتیبان‌گیری از پروژه...$(NC)"
	@mkdir -p backups
	@tar -czf backups/$(PROJECT_NAME)-$(VERSION)-$(shell date +%Y%m%d_%H%M%S).tar.gz \
		--exclude=node_modules \
		--exclude=dist \
		--exclude=coverage \
		--exclude=logs \
		--exclude=tmp \
		--exclude=backups \
		.
	@echo "$(GREEN)پشتیبان‌گیری تکمیل شد$(NC)"

backup-data: ## پشتیبان‌گیری از داده‌ها
	@echo "$(GREEN)پشتیبان‌گیری از داده‌ها...$(NC)"
	@mkdir -p backups
	@if [ -d "data" ]; then \
		tar -czf backups/data-$(shell date +%Y%m%d_%H%M%S).tar.gz data/; \
		echo "$(GREEN)پشتیبان‌گیری از داده‌ها تکمیل شد$(NC)"; \
	else \
		echo "$(YELLOW)دایرکتوری data یافت نشد$(NC)"; \
	fi

update: ## به‌روزرسانی پروژه
	@echo "$(GREEN)به‌روزرسانی پروژه...$(NC)"
	git pull origin main
	make install
	make build
	@echo "$(GREEN)پروژه به‌روزرسانی شد$(NC)"

deploy: ## استقرار روی دستگاه POS
	@echo "$(GREEN)استقرار روی دستگاه POS...$(NC)"
	make build
	make backup
	@echo "$(GREEN)پروژه برای استقرار آماده است$(NC)"
	@echo "$(YELLOW)برای نصب روی دستگاه POS از دستور زیر استفاده کنید:$(NC)"
	@echo "  make install-pos"

deploy-ota: ## استقرار OTA (Over-The-Air)
	@echo "$(GREEN)استقرار OTA...$(NC)"
	@if [ -f "scripts/deploy-ota.sh" ]; then \
		chmod +x scripts/deploy-ota.sh; \
		scripts/deploy-ota.sh; \
	else \
		echo "$(YELLOW)اسکریپت OTA یافت نشد$(NC)"; \
		echo "$(YELLOW)لطفاً فایل‌ها را به صورت دستی منتقل کنید$(NC)"; \
	fi

# دستورات نگهداری
monitor: ## نظارت بر وضعیت برنامه
	@echo "$(GREEN)نظارت بر وضعیت برنامه...$(NC)"
	@if command -v pm2 &> /dev/null; then \
		pm2 status; \
		pm2 logs --lines 20; \
	else \
		echo "$(YELLOW)PM2 نصب نیست$(NC)"; \
		@if [ -f "package.json" ]; then \
			echo "$(YELLOW)برای نصب PM2: npm install -g pm2$(NC)"; \
		fi; \
	fi

logs: ## نمایش لاگ‌های برنامه
	@echo "$(GREEN)نمایش لاگ‌های برنامه...$(NC)"
	@if [ -d "logs" ]; then \
		tail -f logs/*.log; \
	else \
		echo "$(YELLOW)دایرکتوری logs یافت نشد$(NC)"; \
	fi

status: ## نمایش وضعیت سیستم
	@echo "$(GREEN)وضعیت سیستم:$(NC)"
	@echo "$(BLUE)سیستم عامل:$(NC) $(shell uname -s) $(shell uname -r)"
	@echo "$(BLUE)معماری:$(NC) $(shell uname -m)"
	@echo "$(BLUE)حافظه:$(NC) $(shell free -h | grep Mem | awk '{print $2}')"
	@echo "$(BLUE)فضای دیسک:$(NC) $(shell df -h / | tail -1 | awk '{print $4}')"
	@echo "$(BLUE)Node.js:$(NC) $(shell node --version 2>/dev/null || echo 'نصب نیست')"
	@echo "$(BLUE)npm:$(NC) $(shell npm --version 2>/dev/null || echo 'نصب نیست')"

check-deps: ## بررسی وابستگی‌ها
	@echo "$(GREEN)بررسی وابستگی‌ها...$(NC)"
	@if [ -f "package.json" ]; then \
		npm outdated; \
		npm audit; \
	else \
		echo "$(RED)package.json یافت نشد$(NC)"; \
	fi

# دستورات توسعه
setup-dev: ## راه‌اندازی محیط توسعه
	@echo "$(GREEN)راه‌اندازی محیط توسعه...$(NC)"
	make install
	@if [ -f ".env.example" ]; then \
		cp .env.example .env; \
		echo "$(GREEN)فایل .env ایجاد شد$(NC)"; \
	fi
	@if [ -f "config/pos-sdk.example.json" ]; then \
		cp config/pos-sdk.example.json config/pos-sdk.json; \
		echo "$(GREEN)فایل پیکربندی ایجاد شد$(NC)"; \
	fi
	@echo "$(GREEN)محیط توسعه راه‌اندازی شد$(NC)"

# دستورات Docker
docker-build: ## ساخت Docker image
	@echo "$(GREEN)ساخت Docker image...$(NC)"
	@if [ -f "Dockerfile" ]; then \
		docker build -t $(PROJECT_NAME):$(VERSION) .; \
		echo "$(GREEN)Docker image ساخته شد$(NC)"; \
	else \
		echo "$(RED)Dockerfile یافت نشد$(NC)"; \
	fi

docker-run: ## اجرای Docker container
	@echo "$(GREEN)اجرای Docker container...$(NC)"
	@if [ -f "docker-compose.yml" ]; then \
		docker-compose up -d; \
		echo "$(GREEN)Container اجرا شد$(NC)"; \
	else \
		echo "$(RED)docker-compose.yml یافت نشد$(NC)"; \
	fi

docker-stop: ## توقف Docker container
	@echo "$(GREEN)توقف Docker container...$(NC)"
	@if [ -f "docker-compose.yml" ]; then \
		docker-compose down; \
		echo "$(GREEN)Container متوقف شد$(NC)"; \
	else \
		echo "$(RED)docker-compose.yml یافت نشد$(NC)"; \
	fi

# دستورات Git
git-status: ## نمایش وضعیت Git
	@echo "$(GREEN)وضعیت Git:$(NC)"
	git status

git-commit: ## ثبت تغییرات در Git
	@echo "$(GREEN)ثبت تغییرات در Git...$(NC)"
	git add .
	git commit -m "Update: $(shell date)"

git-push: ## ارسال تغییرات به Git
	@echo "$(GREEN)ارسال تغییرات به Git...$(NC)"
	git push origin main

# دستورات نهایی
all: clean install build test ## اجرای تمام مراحل
	@echo "$(GREEN)تمام مراحل با موفقیت تکمیل شد$(NC)"

production: clean install-prod build ## آماده‌سازی برای تولید
	@echo "$(GREEN)پروژه برای تولید آماده است$(NC)"

# نمایش اطلاعات پروژه
info: ## نمایش اطلاعات پروژه
	@echo "$(BLUE)================================$(NC)"
	@echo "$(BLUE) اطلاعات پروژه POS SDK 7220$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@echo "$(GREEN)نام پروژه:$(NC) $(PROJECT_NAME)"
	@echo "$(GREEN)نسخه:$(NC) $(VERSION)"
	@echo "$(GREEN)محیط:$(NC) $(NODE_ENV)"
	@echo "$(GREEN)دایرکتوری ساخت:$(NC) $(BUILD_DIR)"
	@echo "$(GREEN)دایرکتوری اسکریپت‌ها:$(NC) $(SCRIPTS_DIR)"
	@echo "$(GREEN)دایرکتوری مثال‌ها:$(NC) $(EXAMPLES_DIR)"
	@echo "$(GREEN)دایرکتوری پیکربندی:$(NC) $(CONFIG_DIR)"
	@echo "$(BLUE)================================$(NC)"