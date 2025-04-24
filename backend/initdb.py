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
            email TEXT UNIQUE NOT NULL,
            Monday REAL DEFAULT 0,
            Tuesday REAL DEFAULT 0,
            Wednesday REAL DEFAULT 0,
            Thursday REAL DEFAULT 0,
            Friday REAL DEFAULT 0,
            Saturday REAL DEFAULT 0,
            Sunday REAL DEFAULT 0,
            FOREIGN KEY (email) REFERENCES users(email)
        )
    ''')

    conn.commit()
    conn.close()

# Run it
if __name__ == '__main__':
    init_db()
    print("✅ Database initialized with weekly_calories table.")