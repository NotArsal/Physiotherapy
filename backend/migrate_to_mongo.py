import sqlite3
import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB = "physio_sessions.db"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/physio_db")

def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"SQLite DB {SQLITE_DB} not found. Nothing to migrate.")
        return

    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = MongoClient(MONGO_URI)
    db = client.get_default_database(default="physio_db")
    
    print("Connecting to SQLite...")
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Migrate Protocols
    print("Migrating protocols...")
    cursor.execute("SELECT * FROM protocols")
    protocols = cursor.fetchall()
    
    # Create unique index for protocols to prevent duplicates
    db.protocols.create_index([("user_id", 1), ("exercise", 1)], unique=True)
    
    protocols_migrated = 0
    for p in protocols:
        doc = dict(p)
        db.protocols.update_one(
            {"user_id": doc["user_id"], "exercise": doc["exercise"]},
            {"$set": doc},
            upsert=True
        )
        protocols_migrated += 1
    print(f"Migrated {protocols_migrated} protocols.")

    # Migrate Sessions
    print("Migrating sessions...")
    cursor.execute("SELECT * FROM sessions")
    sessions = cursor.fetchall()
    
    sessions_migrated = 0
    for s in sessions:
        doc = dict(s)
        # Parse JSON string back to dict/list for session_data
        if "session_data" in doc and doc["session_data"]:
            try:
                doc["session_data"] = json.loads(doc["session_data"])
            except Exception as e:
                print(f"Failed to parse session_data for session {doc.get('id')}: {e}")
                doc["session_data"] = []
                
        # To avoid duplicate sessions on multiple runs, we could check for uniqueness or just insert
        # We will insert, but remove the SQLite 'id' to let Mongo assign '_id'. 
        # Alternatively, we could keep 'sqlite_id' for reference.
        sqlite_id = doc.pop('id', None)
        if sqlite_id:
            doc['sqlite_id'] = sqlite_id
            
        # Check if already migrated
        existing = db.sessions.find_one({"sqlite_id": sqlite_id})
        if not existing:
            db.sessions.insert_one(doc)
            sessions_migrated += 1

    print(f"Migrated {sessions_migrated} sessions.")
    
    conn.close()
    client.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
