#!/bin/bash
# Database backup script for Ecomerce (Supabase PostgreSQL)
# Usage: ./scripts/backup-db.sh [output-dir]
# Requires DATABASE_URL in environment

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="ecomerce_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "Starting database backup to ${OUTPUT_DIR}/${FILENAME}..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable not set"
  exit 1
fi

pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --verbose \
  | gzip > "${OUTPUT_DIR}/${FILENAME}"

echo "Backup complete: ${OUTPUT_DIR}/${FILENAME}"
echo "Size: $(du -h ${OUTPUT_DIR}/${FILENAME} | cut -f1)"

# Keep only last 7 days of backups
find "$OUTPUT_DIR" -name "ecomerce_backup_*.sql.gz" -mtime +7 -delete

echo "Cleaned up backups older than 7 days"
