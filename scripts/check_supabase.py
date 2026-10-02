import psycopg2

conn_str = "postgresql://postgres.cirikdxbhsnvdczjzndt:T!9vNeb4ghQ2q+u@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

def main():
    try:
        conn = psycopg2.connect(conn_str)
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
        tables = [t[0] for t in cur.fetchall()]
        print("Public tables in Supabase:", tables)
        
        for t in ['buildings', 'units', 'unit_media', 'profiles', 'roles', 'fee_configs']:
            if t in tables:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                cnt = cur.fetchone()[0]
                print(f"Table '{t}': {cnt} rows")
            else:
                print(f"Table '{t}': NOT FOUND")
        conn.close()
    except Exception as e:
        print("Error connecting to Supabase DB:", e)

if __name__ == "__main__":
    main()
