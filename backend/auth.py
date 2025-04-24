# auth.py
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import random
import time
import traceback  # Thêm import cho module traceback
import datetime 

auth = Blueprint('auth', __name__)

DATABASE = "database.db"
OTP_EXPIRATION_TIME = 300  # 5 phút (tính bằng giây)

# Cấu hình Flask-Mail (nếu bạn muốn gửi email thực sự)
# app.config['MAIL_SERVER'] = 'smtp.example.com'
# app.config['MAIL_PORT'] = 465
# app.config['MAIL_USE_SSL'] = True
# app.config['MAIL_USERNAME'] = 'your_email@example.com'
# app.config['MAIL_PASSWORD'] = 'your_email_password'
# mail = Mail(auth) # Khởi tạo Mail instance với blueprint

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        email TEXT UNIQUE NOT NULL,
                                        password TEXT NOT NULL,
                                        targetCalories INTEGER)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS password_reset_tokens (
                                            email TEXT UNIQUE NOT NULL,
                                            otp TEXT NOT NULL,
                                            expiry_time INTEGER NOT NULL,
                                            FOREIGN KEY (email) REFERENCES users(email))''')
    conn.commit()
    conn.close()

init_db()  # Create tables if they don't exist

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def generate_otp():
    return str(random.randint(100000, 999999))

# @auth.route("/send-otp-email", methods=["POST"]) # Ví dụ route gửi email (cần cấu hình Flask-Mail)
# def send_otp_email():
#     data = request.json
#     email = data.get("email")
#     otp = data.get("otp")
#     if not email or not otp:
#         return jsonify({"error": "Missing email or OTP"}), 400
#     msg = Message('Your Password Reset OTP', sender='your_email@example.com', recipients=[email])
#     msg.body = f"Your OTP for password reset is: {otp}. This OTP will expire in 5 minutes."
#     try:
#         mail.send(msg)
#         return jsonify({"message": "OTP sent successfully"}), 200
#     except Exception as e:
#         print(f"Error sending email: {e}")
#         return jsonify({"error": "Failed to send OTP email"}), 500

# Forgot password endpoint
@auth.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Email not found"}), 404

    otp = generate_otp()
    expiry_time = int(time.time()) + OTP_EXPIRATION_TIME

    try:
        cursor.execute("INSERT OR REPLACE INTO password_reset_tokens (email, otp, expiry_time) VALUES (?, ?, ?)", (email, otp, expiry_time))
        conn.commit()
        conn.close()
        print(f"OTP generated for {email}: {otp}") # In OTP ra console (chỉ dành cho development)
        return jsonify({"message": "OTP sent to your email"}), 200 # Cần tích hợp gửi email thực tế
    except Exception as e:
        conn.close()
        print(f"Error saving OTP: {e}")
        return jsonify({"error": "Failed to generate and save OTP"}), 500

@auth.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    email = data.get("email")
    otp = data.get("otp")
    new_password = data.get("new_password")

    if not email or not otp or not new_password:
        return jsonify({"error": "Missing email, OTP, or new password"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT otp, expiry_time FROM password_reset_tokens WHERE email = ?", (email,))
    reset_request = cursor.fetchone()

    if not reset_request:
        conn.close()
        return jsonify({"error": "Invalid email or OTP"}), 400

    stored_otp, expiry = reset_request
    if int(time.time()) > expiry:
        cursor.execute("DELETE FROM password_reset_tokens WHERE email = ?", (email,))
        conn.commit()
        conn.close()
        return jsonify({"error": "OTP has expired"}), 400

    if otp == stored_otp:
        hashed_password = generate_password_hash(new_password)
        cursor.execute("UPDATE users SET password = ? WHERE email = ?", (hashed_password, email))
        cursor.execute("DELETE FROM password_reset_tokens WHERE email = ?", (email,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Password reset successfully. You can now log in with your new password."}), 200
    else:
        conn.close()
        return jsonify({"error": "Invalid OTP"}), 400

@auth.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    target_calories_burned = data.get("targetCaloriesburned") # ĐÃ SỬA TÊN BIẾN ĐỂ KHỚP VỚI FRONTEND

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, password, targetCaloriesburned) VALUES (?, ?, ?)", (email, hashed_password, target_calories_burned)) # ĐÃ SỬA TÊN CỘT
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Email already exists"}), 409
    except Exception as e:
        conn.close()
        print(f"Registration error: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred during registration"}), 500
    
@auth.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, password, lastChangecalories FROM users WHERE email = ?", (email,))   
    user = cursor.fetchone()
    if user:
        if check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            today_str = datetime.date.today().isoformat() # lấy ngày hiện tại

            # Kiểm tra lastChangecalories và cập nhật caloriesCurrentday nếu cần
            if user['lastChangecalories'] is None or user['lastChangecalories'] < today_str:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("UPDATE users SET caloriesCurrentday = 0")
                conn.commit()
                conn.close()
                return jsonify({"message": "Logged in successfully, daily calories reset"}), 200
            else:
                return jsonify({"message": "Login successful"}), 200
        else:
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
    else:
        conn.close()
        return jsonify({"error": "Invalid credentials"}), 401
    
@auth.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None) # Xóa thông tin user_id khỏi session
    return jsonify({'message': 'Logged out successfully'}), 200