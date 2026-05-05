#!/bin/bash
# Installation script for Brave Search Extension

set -e

echo "🔍 Brave Search Extension Installer"
echo "===================================="
echo ""

# Check if bx is installed
if ! command -v bx &> /dev/null; then
    echo "❌ Brave Search CLI (bx) not found"
    echo ""
    echo "Please install it from: https://brave.com/search/api/"
    exit 1
fi

echo "✅ Brave Search CLI found: $(which bx)"

# Check API key
if ! bx config show-key &> /dev/null 2>&1; then
    echo ""
    echo "⚠️  API key not configured"
    echo "Run: bx config set-key YOUR_API_KEY"
    echo ""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/brave-search.ts"

# Install location
PI_EXT_DIR="$HOME/.pi/agent/extensions"
if [ ! -d "$PI_EXT_DIR" ]; then
    mkdir -p "$PI_EXT_DIR"
fi

# Backup existing installation
if [ -f "$PI_EXT_DIR/brave-search.ts" ]; then
    echo ""
    echo "⚠️  Backing up existing installation..."
    cp "$PI_EXT_DIR/brave-search.ts" "$PI_EXT_DIR/brave-search.ts.backup.$(date +%Y%m%d%H%M%S)"
fi

# Install
cp "$SOURCE_FILE" "$PI_EXT_DIR/brave-search.ts"

echo ""
echo "✅ Extension installed to: $PI_EXT_DIR/brave-search.ts"
echo ""
echo "🎯 Web Search Tool"
echo "================="
echo ""
echo "The LLM will see ONE tool: web_search"
echo ""
echo "Usage examples:"
echo '  "Search for TypeScript docs"        → type="web" (default)'
echo '  "How does Rust work?"               → type="answers"'
echo '  "AI news this week"                 → type="news", freshness="pw"'
echo '  "Find tutorial videos"              → type="videos"'
echo '  "Extract API documentation"         → type="context"'
echo ""
echo "Next steps:"
echo "  1. Restart Pi or run: /reload"
echo "  2. Try: \"Find documentation about TypeScript\""
echo ""
