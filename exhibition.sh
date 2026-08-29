#!/bin/bash

# Build and start all services
docker-compose -f docker-compose.yml up -d --build

# Check if everything is running
docker-compose ps

# Print IP addresses for the exhibition team
echo "========================================="
echo "Game Frontend: http://localhost:3000"
echo "========================================="
