#!/bin/bash
echo "=========================================="
echo "Football Tipster Platform - Installation"
echo "=========================================="

# Check Python version
python3 --version || { echo "Python 3.9+ required"; exit 1; }

# Check PostgreSQL
psql --version || { echo "PostgreSQL required"; exit 1; }

echo ""
echo "Step 1: Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "Step 2: Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env file"
    echo "⚠️  IMPORTANT: Edit .env with your credentials!"
    echo "   - API_FOOTBALL_KEY"
    echo "   - DATABASE_URL"
    echo "   - ADMIN_PASSWORD"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Step 3: Database setup..."
read -p "Initialize database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    source .env
    psql $DATABASE_URL < database/schema.sql
    echo "✓ Database initialized"
fi

echo ""
echo "Step 4: Creating 25 AI tipsters..."
python3 scripts/setup_tipsters.py

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Edit .env with your API key and database credentials"
echo "2. Run: python3 scripts/generate_predictions.py (test)"
echo "3. Run: streamlit run admin/dashboard.py (admin interface)"
echo "4. Run: uvicorn api.main:app (API server)"
echo "5. Run: python3 scripts/scheduler.py (automated daily tasks)"
echo ""
echo "Documentation: See README.md"
