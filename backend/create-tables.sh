#!/bin/bash
# Create tables in Supabase using curl

SUPABASE_URL="${SUPABASE_URL:-}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  echo "Set them before running this script, for example:"
  echo "  export SUPABASE_URL=https://your-project.supabase.co"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=sb_secret_..."
  exit 1
fi

echo "🚀 Creating tables in Supabase..."
echo ""

# SQL to execute
SQL='
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('"'"'art'"'"', '"'"'event'"'"', '"'"'interior'"'"')),
  price text NOT NULL,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order ON galleries (category, active, "order");
'

# Try executing via Supabase REST API
echo "Attempting to execute SQL..."
echo ""

# Method 1: Try via exec_sql RPC
echo "Method 1: Using exec_sql RPC function..."

curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"CREATE EXTENSION IF NOT EXISTS \\\"pgcrypto\\\";\"}" \
  2>/dev/null

echo ""
echo ""

# If that failed, show instructions
echo "⚠️  If exec_sql is not available, please run SQL manually:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql"
echo "2. Click 'New Query'"
echo "3. Paste the SQL from migrations/001_init.sql"
echo "4. Click 'Run'"
