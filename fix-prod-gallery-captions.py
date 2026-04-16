#!/usr/bin/env python3
"""
Script to apply gallery_captions column to production database
Run this on your VPS to fix: "The column `gallery_captions` does not exist in the current database"

Usage: python3 fix-prod-gallery-captions.py
Or if you have production DATABASE_URL: python3 fix-prod-gallery-captions.py postgresql://user:pass@host:5432/dbname
"""

import psycopg2
import sys
import os

def apply_production_migration(database_url=None):
    """Apply the gallery_captions migration to production database"""
    
    # Try to get DATABASE_URL from arguments, env, or .env.local file
    if not database_url:
        # Try environment variable (used by Prisma)
        database_url = os.environ.get('DATABASE_URL_RUNTIME') or os.environ.get('DATABASE_URL')
        
        # If still not found, try reading from .env.local
        if not database_url and os.path.exists('.env.local'):
            with open('.env.local', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL'):
                        database_url = line.split('=', 1)[1].strip()
                        break
        
        if not database_url and os.path.exists('.env.example'):
            print("⚠️  Using DATABASE_URL from .env.example (may not work if production is different)")
            with open('.env.example', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL_RUNTIME'):
                        database_url = line.split('=', 1)[1].strip()
                        break
    
    if not database_url:
        print("❌ DATABASE_URL not found!")
        print("\nUsage:")
        print("  python3 fix-prod-gallery-captions.py postgresql://user:pass@host:5432/dbname")
        print("\nOr set DATABASE_URL in .env.local or environment variable")
        sys.exit(1)
    
    # Parse connection URL to handle special characters in password
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        conn_params = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/').split('?')[0],
            'user': parsed.username,
            'password': parsed.password
        }
        
        print(f"🔌 Connecting to production database at {conn_params['host']}...")
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        
        print("✅ Connected to production database\n")
        
        # Check if column already exists
        print("🔍 Checking if gallery_captions column already exists...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'article_translations' 
                AND column_name = 'gallery_captions'
            );
        """)
        
        column_exists = cursor.fetchone()[0]
        
        if column_exists:
            print("✅ Column already exists! No migration needed.\n")
            cursor.close()
            conn.close()
            return True
        
        print("❌ Column missing. Applying migration...\n")
        
        # Apply the migration
        migration_sql = """
        -- AddColumn gallery_captions to article_translations
        ALTER TABLE "article_translations" ADD COLUMN "gallery_captions" TEXT;
        """
        
        print(f"Executing SQL:\n{migration_sql}\n")
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration executed successfully!\n")
        
        # Verify the column was added
        print("🔍 Verifying column was added...")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'article_translations'
            AND column_name = 'gallery_captions';
        """)
        
        result = cursor.fetchone()
        if result:
            col_name, col_type = result
            print(f"✅ Column verified: {col_name} ({col_type})\n")
        else:
            print("❌ Column verification failed!\n")
            return False
        
        # Show all columns in the table
        print("📊 All columns in article_translations table:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'article_translations'
            ORDER BY ordinal_position;
        """)
        
        print("Column Name                      | Data Type")
        print("-" * 60)
        for col_name, data_type in cursor.fetchall():
            print(f"{col_name:30} | {data_type}")
        
        print("\n" + "="*60)
        print("🎉 Production database fixed successfully!")
        print("="*60)
        print("\n✅ The translation feature should now work on https://intambwemedia.com/admin/")
        print("\nNext steps:")
        print("1. Refresh https://intambwemedia.com/admin/ in your browser")
        print("2. Try translating an article")
        print("3. The gallery captions should now be preserved in translations\n")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Database connection error: {e}")
        print("\nPlease verify:")
        print("- DATABASE_URL is correct in .env.local")
        print("- Production database is accessible from your VPS")
        print("- Network firewall allows connection to the database host\n")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    db_url = sys.argv[1] if len(sys.argv) > 1 else None
    apply_production_migration(db_url)
