#!/bin/bash

# Set exhibition-specific environment variables
export REACT_APP_API_URL=http://192.168.1.100:8000
export REACT_APP_WS_URL=ws://192.168.1.100:8000/ws

# Build and start all services
docker-compose -f docker-compose.yml up -d --build

# Check if everything is running
docker-compose ps

# Print IP addresses for the exhibition team
echo "========================================="
echo "Game Frontend: http://localhost:3000"
echo "Admin Panel: http://localhost:3001"
echo "Backend API: http://localhost:8000"
echo "========================================="