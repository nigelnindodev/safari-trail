#!/bin/sh
# docker/ollama/entrypoint.sh

# Start ollama server in background
ollama serve &
OLLAMA_PID=$!

# Wait for the server to be ready
echo "Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
  sleep 1
done

echo "Pulling nomic-embed-text..."
ollama pull nomic-embed-text

# Hand off to the ollama server process
wait $OLLAMA_PID
