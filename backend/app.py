# app.py
from flask import Flask, request, jsonify, render_template, session, redirect
from flask_cors import CORS
from auth import auth
from gps_tracker import start_gps_tracking, get_tracking_data, is_connected # Đảm bảo import get_tracking_data
from threading import Thread
import sqlite3

app = Flask(__name__)
app.secret_key = 'your_secret_key' # Cần thiết cho Flask Sessions
DATABASE = 'database.db'

# Enable CORS for all routes and methods globally
CORS(app, resources={r"/*": {"origins": "*"}})

# Register authentication routes from auth.py
app.register_blueprint(auth, url_prefix="/auth")

# Dictionary to store user-specific iPhone IP addresses
user_ips = {}
tracking_threads = {} # Lưu trữ thread theo email/user_id nếu cần quản lý nhiều phiên

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Để trả về kết quả dạng dictionary
    return conn

def get_user_info(user_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT email, targetCalories AS goal FROM users WHERE id = ?", (user_id,)) # Chỉ lấy email và targetCalories
    user = cursor.fetchone()
    db.close()
    if user:
        return dict(user)
    else:
        return None

# --- Routes for serving frontend ---
@app.route('/')
def index():
    return render_template('firstpage.html')

@app.route('/login')
def login_page():
    return render_template('firstpage.html')

@app.route('/register')
def register_page():
    return render_template('firstpage.html')

@app.route('/tracking')
def tracking_page():
    if 'user_id' in session:
        return render_template('tracking.html')
    else:
        return redirect('/login')

@app.route('/progress')
def progress_page():
    if 'user_id' in session:
        return render_template('progress.html')
    else:
        return redirect('/login')

@app.route('/profile')
def profile_page():
    if 'user_id' in session:
        user_id = session['user_id']
        user_data = get_user_info(user_id)
        if user_data:
            return render_template('profile.html', user=user_data) # 'user' sẽ chỉ có 'email' và 'goal'
        else:
            # Xử lý trường hợp không tìm thấy thông tin người dùng
            return render_template('profile.html', error="Could not load profile information.")
    else:
        return redirect('/login')

@app.route('/dashboard') # Bạn có thể xóa hoặc cập nhật route này
def dashboard_page():
    return render_template('firstpage.html') # Tạm thời

# --- Backend API Routes ---
@app.route("/register_ip", methods=["POST"])
def register_ip():
    data = request.get_json()
    print("📩 Received Data:", data)

    email = data.get("email")
    iphone_ip = data.get("iphone_ip")

    if not email:
        return jsonify({"error": "Missing email"}), 400
    if not iphone_ip:
        return jsonify({"error": "Missing iPhone IP"}), 400

    user_ips[email] = iphone_ip
    try:
        print(f"🚀 Starting GPS tracking for {iphone_ip}")
        tracking_thread = Thread(target=start_gps_tracking, args=(iphone_ip,))
        tracking_thread.daemon = True
        tracking_thread.start()

        print("✅ GPS Tracking Started")
    except Exception as e:
        print(f"❌ Error Starting GPS Tracking: {e}")
        return jsonify({"error": "Failed to start GPS tracking"}), 500
    return jsonify({"message": "GPS tracking started"}), 200

@app.route("/get_tracking_data", methods=["GET"])
def get_data():
    data = get_tracking_data() # Gọi hàm get_tracking_data từ gps_tracker.py
    return jsonify(data), 200

@app.route("/get_calories", methods=["GET"])
def get_total_calories():
    tracking_data = get_tracking_data() # Lấy toàn bộ dữ liệu tracking
    calories = tracking_data.get("calories", 0) # Lấy giá trị calories, mặc định là 0 nếu không có
    return jsonify({"calories": calories}), 200

@app.route("/check-connection", methods=["GET"])
def check_connection():
    status = "Connected" if is_connected() else "Not Connected"
    return jsonify({"status": status})

if __name__ == "__main__":
    app.run(debug=True)