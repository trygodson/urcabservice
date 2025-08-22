#!/bin/bash

# Google App Engine Deployment Script for UrCab Services
# Make sure you have gcloud CLI installed and authenticated

echo "🚀 Starting deployment of UrCab services to Google App Engine..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Build all applications
echo "📦 Building all applications..."
npm run build:all

# Deploy User API (default service)
echo "🌐 Deploying User API (default service)..."
gcloud app deploy app.yaml --quiet

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy User API"
    exit 1
fi

# Deploy Driver API
echo "🚗 Deploying Driver API..."
gcloud app deploy app-driver.yaml --quiet

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Driver API"
    exit 1
fi

# Deploy Admin API
echo "👨‍💼 Deploying Admin API..."
gcloud app deploy app-admin.yaml --quiet

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy Admin API"
    exit 1
fi

echo "✅ All services deployed successfully!"
echo ""
echo "📋 Service URLs:"
echo ""
echo "🔧 To view logs: gcloud app logs tail -s default|driver-api|admin-api"
echo "📊 To view in browser: gcloud app browse -s default|driver-api|admin-api"
