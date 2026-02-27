#!/bin/bash
docker build -t test-app .
docker run -d -p 3001:3000 --name test-container test-app
sleep 5
docker logs test-container
curl -s http://localhost:3001/health
docker rm -f test-container
