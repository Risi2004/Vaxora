import psycopg2

conn_str = "host=ep-sparkling-fire-ae85n4vh-pooler.c-2.us-east-2.aws.neon.tech dbname=neondb user=neondb_owner password=npg_yoTu6vF1KNJx sslmode=require"

conn = psycopg2.connect(conn_str)
cur = conn.cursor()
cur.execute('DELETE FROM "Appointments" WHERE "Notes" LIKE \'Automated%\';')
conn.commit()
print("Cleaned up automated test appointments from database.")
