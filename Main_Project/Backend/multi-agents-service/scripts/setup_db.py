"""
Database Setup Script
File: scripts/setup_db.py

Usage:
    python scripts/setup_db.py
    python scripts/setup_db.py --reset  # WARNING: Drops all tables
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db.database import init_db, drop_all_tables, test_connection, engine
from src.db.models import Base


def setup_database(reset: bool = False):
    """Setup database tables"""
    print("\n" + "="*60)
    print("Financial Advisor - Database Setup")
    print("="*60)
    
    # Test connection
    print("\n🔌 Testing database connection...")
    if not test_connection():
        print("\n✗ Cannot connect to database.")
        print("Please check your .env file and ensure PostgreSQL is running.")
        print("\nExpected environment variable:")
        print("  DATABASE_URL=postgresql://user:password@localhost:5432/financial_advisor")
        sys.exit(1)
    
    # Drop tables if reset requested
    if reset:
        print("\n⚠️  RESET requested - dropping all tables...")
        response = input("Are you sure? Type 'yes' to confirm: ")
        if response.lower() == 'yes':
            drop_all_tables()
            print("✓ All tables dropped")
        else:
            print("✗ Reset cancelled")
            sys.exit(0)
    
    # Create tables
    print("\n🔧 Creating database tables...")
    try:
        init_db()
        print("\n✅ Database setup complete!")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n📋 Created {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")
        
    except Exception as e:
        print(f"\n✗ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Setup PostgreSQL database")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all existing tables before creating (WARNING: destroys data)"
    )
    
    args = parser.parse_args()
    setup_database(reset=args.reset)


if __name__ == "__main__":
    main()