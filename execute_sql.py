import psycopg2
import sys
from urllib.parse import quote_plus

# Database connection parameters (not using connection string due to special chars in password)
try:
    # Connect to the database using individual parameters
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="amakuru_db",
        user="postgres",
        password="Irafasha@2025"
    )
    cursor = conn.cursor()
    
    # Read SQL file
    with open('add_column.sql', 'r') as f:
        sql = f.read()
    
    print("Executing SQL:")
    print(sql)
    print("\n" + "="*50 + "\n")
    
    # Execute the SQL
    cursor.execute(sql)
    conn.commit()
    
    print("SQL executed successfully!")
    
    # Verify the column was added
    print("\nVerifying column was added...")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'article_translations'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\nColumns in article_translations table:")
    print("Column Name | Data Type")
    print("-" * 40)
    for col_name, data_type in columns:
        print(f"{col_name:30} | {data_type}")
    
    # Check specifically for gallery_captions
    gallery_captions_found = any(col[0] == 'gallery_captions' for col in columns)
    if gallery_captions_found:
        print("\n✓ gallery_captions column successfully added!")
    else:
        print("\n✗ gallery_captions column NOT found!")
    
    cursor.close()
    conn.close()
    
except psycopg2.OperationalError as e:
    print(f"Error connecting to database: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
