#!/bin/sh
set -e

# API pro poptávkový formulář; když spadne, samo se zvedne (nginx běží dál)
while true; do
  node /app/server.js || echo "api spadlo, restart za 3 s"
  sleep 3
done &

exec nginx -g 'daemon off;'
