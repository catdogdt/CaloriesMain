import sqlite3
import os

def init_db():
    db_path = os.path.join(os.path.dirname(__file__), 'database.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Create the weekly_calories table
    c.execute('''
        CREATE TABLE IF NOT EXISTS weekly_calories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            monday REAL DEFAULT 0,
            tuesday REAL DEFAULT 0,
            wednesday REAL DEFAULT 0,
            thursday REAL DEFAULT 0,
            friday REAL DEFAULT 0,
            saturday REAL DEFAULT 0,
            sunday REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()

# Run it
if __name__ == '__main__':
    init_db()
    print("✅ Database initialized with weekly_calories table.")