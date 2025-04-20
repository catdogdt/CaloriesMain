from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

auth = Blueprint('auth', __name__)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    email TEXT UNIQUE NOT NULL,
                                    password TEXT NOT NULL,
                                    targetCalories INTEGER)''') # Thêm cột targetCalories
    conn.commit()
    conn.close()

init_db()  # Create table if it doesn't exist

# Register endpoint
@auth.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    target_calories = data.get("target_calories") # Nhận target_calories

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, password, targetCalories) VALUES (?, ?, ?)", (email, hashed_password, target_calories)) # Lưu target_calories
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 400

# Login endpoint
@auth.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, password FROM users WHERE email = ?", (email,)) # Lấy cả id
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user[1], password): # user[1] là password đã hash
        session['user_id'] = user[0] # Lưu user_id vào session
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401
    
@auth.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None) # Xóa thông tin user_id khỏi session
    return jsonify({'message': 'Logged out successfully'}), 200