import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="amakuru_db",
        user="postgres",
        password="Irafasha@2025"
    )
    cursor = conn.cursor()
    
    # Verify the gallery_captions column exists
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'article_translations'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("Columns in article_translations table:")
    print("-" * 70)
    print(f"{'Column Name':<30} | {'Data Type':<20} | {'Nullable':<10}")
    print("-" * 70)
    for col_name, data_type, nullable in columns:
        nullable_str = "YES" if nullable == "YES" else "NO"
        print(f"{col_name:<30} | {data_type:<20} | {nullable_str:<10}")
    
    # Check specifically for gallery_captions
    gallery_captions_found = any(col[0] == 'gallery_captions' for col in columns)
    print("\n" + "="*70)
    if gallery_captions_found:
        print("✓ gallery_captions column successfully recognized!")
    else:
        print("✗ gallery_captions column NOT found!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
