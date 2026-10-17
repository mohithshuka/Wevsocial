#!/bin/sh
set -e

echo "Waiting for Postgres..."
until node -e "require('net').connect(5432, 'postgres').on('connect', () => process.exit(0)).on('error', () => process.exit(1))" 2>/dev/null; do
  sleep 1
done
echo "Postgres is up."

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent)..."
npx ts-node prisma/seed.ts

echo "Starting server..."
exec node dist/index.js
