#!/bin/bash
# ============================================================================
# Setup script: Bootstrap RL Orchestrator project in your VS Code workbench
# ============================================================================
# Usage:
#   1. Copy the entire transfer_package/ folder into your workbench
#   2. cd into the folder
#   3. Run: bash setup.sh
#
# This script:
#   - Creates the project directory structure
#   - Moves files to the right locations
#   - Verifies CLAUDE.md is in place for Claude Code
#   - Creates a Python virtual environment (optional)
# ============================================================================

set -e

echo "=================================================="
echo "🚀 Setting up RL Orchestrator project..."
echo "=================================================="

# 1. Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/agents
mkdir -p src/orchestrator
mkdir -p src/data
mkdir -p data
mkdir -p notebooks
mkdir -p docs
mkdir -p .claude/rules

# 2. Move files to correct locations if they're in flat structure
# (If you copied the transfer_package contents to project root)

# CLAUDE.md should already be at project root
if [ -f "CLAUDE.md" ]; then
    echo "✅ CLAUDE.md found at project root"
else
    echo "⚠️  CLAUDE.md not found! Copy it to your project root."
    echo "   Claude Code reads this file automatically every session."
fi

# Check .claude/rules/
for f in architecture.md datasets.md metrics.md; do
    if [ -f ".claude/rules/$f" ]; then
        echo "✅ .claude/rules/$f found"
    else
        echo "⚠️  .claude/rules/$f missing"
    fi
done

# 3. Move Python files to src/ if they exist at root
if [ -f "poc_rl_orchestrator.py" ]; then
    cp poc_rl_orchestrator.py notebooks/01_poc_orchestrator.py
    echo "✅ Moved poc_rl_orchestrator.py → notebooks/"
fi

if [ -f "poc_datasets_eda_metrics.py" ]; then
    cp poc_datasets_eda_metrics.py notebooks/02_datasets_eda_metrics.py
    echo "✅ Moved poc_datasets_eda_metrics.py → notebooks/"
fi

# 4. Move CSV data files
for f in dataset_fundamental.csv dataset_technical.csv dataset_screening.csv dataset_orchestrator.csv; do
    if [ -f "$f" ]; then
        mv "$f" data/
        echo "✅ Moved $f → data/"
    elif [ -f "data/$f" ]; then
        echo "✅ data/$f already in place"
    fi
done

# 5. Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.venv/
venv/

# Claude Code local memory (personal, don't share)
CLAUDE.local.md

# Data (large files — use Git LFS or DVC in production)
# data/*.csv

# MLflow
mlruns/
mlflow.db

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db
EOF
echo "✅ Created .gitignore"

# 6. Create README.md
cat > README.md << 'EOF'
# RL-Based Agent Orchestrator for Investment Chatbot

An ML/OPS system using Reinforcement Learning to orchestrate AI agents for investment analysis.

## Quick start

```bash
# Install dependencies
pip install numpy pandas

# Run PoC orchestrator
python notebooks/01_poc_orchestrator.py

# Run dataset generation + EDA
python notebooks/02_datasets_eda_metrics.py
```

## Project structure

See `CLAUDE.md` for full architecture overview.

## Working with Claude Code

This project uses `CLAUDE.md` and `.claude/rules/` for persistent AI context.
Claude Code automatically loads these files every session — no need to re-explain
the project architecture or decisions.

For deep context, reference `docs/context_from_claude_chat.md`.
EOF
echo "✅ Created README.md"

# 7. Optional: Create venv
read -p "🐍 Create Python virtual environment? (y/n): " create_venv
if [ "$create_venv" = "y" ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install numpy pandas
    echo "✅ Virtual environment created and activated"
    echo "   Run: source .venv/bin/activate"
fi

echo ""
echo "=================================================="
echo "✅ Setup complete!"
echo "=================================================="
echo ""
echo "📌 Next steps:"
echo "   1. Open this folder in VS Code"
echo "   2. Open Claude Code (Ctrl+Shift+P → 'Claude Code')"
echo "   3. Claude will auto-read CLAUDE.md + .claude/rules/"
echo "   4. Start with: 'Tôi muốn tiếp tục phát triển PoC orchestrator'"
echo ""
echo "📌 Verify Claude Code loaded context:"
echo "   Type /memory in Claude Code to see loaded files"
echo ""
