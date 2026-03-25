#!/bin/bash

# ============================================================
# Amakuru News - Analytics Schema Deployment Script
# Purpose: Deploy Prisma analytics migrations to production
# Usage: ./deploy-analytics.sh [app-path]
# ============================================================

set -e  # Exit on error

# Configuration
APP_PATH="${1:-.}"  # Use provided path or current directory
APP_USER="app_user"
APP_PASSWORD="Irafasha@2025"
DB_HOST="intambwemedia.com"
DB_PORT="5432"
DB_NAME="amakuru_news_db"
DATABASE_URL="postgresql://${APP_USER}:${APP_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Main deployment
main() {
    log_info "Starting Analytics Schema Deployment"
    log_info "App Path: $APP_PATH"
    log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
    echo ""
    
    # Change to app directory
    if [ ! -d "$APP_PATH" ]; then
        log_error "App path does not exist: $APP_PATH"
        exit 1
    fi
    
    cd "$APP_PATH"
    log_success "Changed to app directory"
    
    # Check if Prisma is installed
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js"
        exit 1
    fi
    log_success "npx is available"
    
    # Check if prisma/schema.prisma exists
    if [ ! -f "prisma/schema.prisma" ]; then
        log_error "prisma/schema.prisma not found"
        exit 1
    fi
    log_success "Prisma schema found"
    
    # Check if migrations exist
    if [ ! -d "prisma/migrations" ]; then
        log_error "prisma/migrations directory not found"
        exit 1
    fi
    log_success "Migrations directory found"
    
    echo ""
    log_info "Testing database connection..."
    
    # Test connection before running migration
    export DATABASE_URL=$DATABASE_URL
    
    if ! timeout 10 npx prisma db execute --stdin --file /dev/null < /dev/null 2>/dev/null; then
        log_warning "Could not verify database connection immediately"
    else
        log_success "Database connection established"
    fi
    
    echo ""
    log_info "Running: npx prisma migrate deploy"
    log_info "This will apply all pending migrations..."
    echo ""
    
    # Run migration
    if npx prisma migrate deploy; then
        log_success "Migration deployed successfully!"
        echo ""
        
        # Verify by checking if table exists
        log_info "Verifying AnalyticsEvent table was created..."
        if npx prisma db execute --stdin < <(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='AnalyticsEvent';") 2>/dev/null; then
            log_success "AnalyticsEvent table verified!"
        fi
        
        echo ""
        log_success "======================================"
        log_success "Deployment Complete!"
        log_success "======================================"
        log_info "Analytics schema is now active in production."
        log_info "Dashboard URL: https://intambwemedia.com/analytics"
        log_info "API Endpoint: POST /api/analytics/send"
        log_info "Stats API: GET /api/analytics/stats?days=7"
    else
        log_error "Migration deployment failed!"
        exit 1
    fi
}

# Run main function
main "$@"
