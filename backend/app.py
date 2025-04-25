from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_file
from flask_cors import CORS
from auth import auth
from gps_tracker import GPSTracker
from threading import Thread
import sqlite3
import time  # Import thư viện time
import datetime
import os 
import io
import matplotlib.pyplot as plt
import pandas as pd
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.secret_key = 'your_secret_key'

DATABASE = os.path.abspath('database.db')


CORS(app, resources={r"/*": {"origins": "*"}})
app.register_blueprint(auth, url_prefix="/auth")

#user_ips = {} # Không cần dictionary này nữa, IP sẽ được lưu trong đối tượng GPSTracker
#tracking_threads = {} # Không cần dictionary này nữa, thread sẽ được quản lý cùng với tracker instance
active_trackers = {} # Lưu trữ các đối tượng GPSTracker đang hoạt động, khoá bằng user_id

def get_db():
    print('>>> Connecting to DB:', DATABASE)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;") 
    return conn

def get_user_info(user_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT email, targetCaloriesburned AS goal, totalKcal, totalKm, totalMin FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    db.close()
    if user:
        return dict(user)
    else:
        return None

# Hàm trợ giúp lấy tracker của user
def get_user_tracker():
    user_id = session.get('user_id')
    if user_id in active_trackers:
        return active_trackers[user_id]
    return None

# Hàm trợ giúp để dừng tracker của user (khi đăng xuất hoặc đăng ký IP mới)
def stop_user_tracker():
    user_id = session.get('user_id')
    if user_id in active_trackers:
        tracker = active_trackers.pop(user_id) # Lấy và xóa tracker khỏi dictionary
        tracker.stop()  # Dừng theo dõi GPS
        print(f"Stopped tracking for user {user_id}")

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
    if 'user_id' not in session:
        return redirect(url_for('login'))

    user_id = session['user_id']

    conn = get_db()
    user_data = conn.execute(
        'SELECT * FROM weekly_calories WHERE user_id = ?',
        (user_id,)
    ).fetchone()
    conn.close()

    # If user_data is None, create a default dictionary
    if user_data is None:
        weekly_data = {
            'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
            'Friday': 0, 'Saturday': 0, 'Sunday': 0
        }
    else:
        weekly_data = {
            'Monday': user_data['monday'],
            'Tuesday': user_data['tuesday'],
            'Wednesday': user_data['wednesday'],
            'Thursday': user_data['thursday'],
            'Friday': user_data['friday'],
            'Saturday': user_data['saturday'],
            'Sunday': user_data['sunday'],
        }

    max_calories = max(weekly_data.values()) if weekly_data else 1
    total = sum(weekly_data.values())
    avg = round(total / 7, 1)

    return render_template(
        'progress.html',
        weekly_data=weekly_data,
        max_calories=max_calories,
        total=total,
        avg=avg
    )

@app.route('/profile')
def profile_page():
    if 'user_id' in session:
        user_id = session['user_id']
        user_data = get_user_info(user_id)
        if user_data:
            return render_template('profile.html',  
                                   user=user_data,
                                   total_kcal=user_data.get('totalKcal', 0.00),
                                   total_km=user_data.get('totalKm', 0.00),
                                   total_min=user_data.get('totalMin', 0.00))
        else:
            return render_template('profile.html', error="Could not load profile information.")
    else:
        return redirect('/login')
    
@app.route('/api/profile')
def get_profile_data():
    if 'user_id' in session:
        user_id = session['user_id']
        user_data = get_user_info(user_id)
        if user_data:
            return jsonify({
                'total_kcal': user_data.get('totalKcal'),
                'total_km': user_data.get('totalKm'),
                'total_min': user_data.get('totalMin'),
                'goal': user_data.get('goal', 0)
            })
        else:
            return jsonify({'error': 'Could not load profile information.'}), 404
    else:
        return jsonify({'error': 'User not logged in.'}), 401

@app.route('/dashboard')
def dashboard_page():
    return render_template('firstpage.html')

# --- Backend API Routes ---
@app.route("/register_ip", methods=["POST"])
def register_ip():
    # Phải đăng nhập để đăng ký IP
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401
    
    user_id = session['user_id']
    data = request.get_json()
    print("📩 Received Data:", data)

    
    #email = data.get("email") # Email không cần thiết ở đây nếu đã dùng user_id
    iphone_ip = data.get("iphone_ip")

    #if not email: # Không cần thiết nữa vì đã có user_id
    #    return jsonify({"error": "Missing email"}), 400
    if not iphone_ip:
        return jsonify({"error": "Missing iPhone IP"}), 400

    #user_ips[email] = iphone_ip # Không cần thiết nữa vì đã có user_id

    # Dừng tracker cũ nếu có
    if user_id in active_trackers:
        print(f"Stopping existing tracker for user {user_id}...")
        stop_user_tracker() #Sử dụng hàm trợ giúp dừng và xoá
    
    try:
        print(f"🚀 Starting GPS tracking for user {user_id} at IP {iphone_ip}")
        # Tạo đối tượng GPSTracker mới và bắt đầu theo dõi
        tracker = GPSTracker(iphone_ip)
        #Lưu đối tượng tracker vào dictionary dùng user_id làm khóa
        active_trackers[user_id] = tracker

        # Tạo và chạy thread với phương thức run_tracking_loop của đối tượng tracker
        tracking_thread = Thread(target=tracker.run_tracking_loop)
        tracking_thread.daemon = True
        tracking_thread.start()

        # Không cần time.sleep(3) ở đây vì đã có trong run_tracking_loop
        # Phản hồi ngay lập tức báo đã khởi tạo quá trình theo dõi
        return jsonify({"status": "success", "message": "GPS tracking initiation started. Check /connection_status for actual status."}), 200

    except Exception as e:
        print(f"❌ Error Starting GPS Tracking for user {user_id}: {e}")
        # Đảm bảo xoá tracker nếu có lỗi xảy ra
        if user_id in active_trackers:
            del active_trackers[user_id]
        return jsonify({"status": "error", "message": f"Lỗi khi bắt đầu theo dõi GPS: {e}"}), 500
@app.route("/generate_progress_chart")
def generate_progress_chart():
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401

    user_id = session['user_id']
    conn = get_db()
    cursor = conn.cursor()

    # Fetch weekly calories data
    cursor.execute('SELECT Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "No data found"}), 404

    # Unpack the row into variables for each day
    monday, tuesday, wednesday, thursday, friday, saturday, sunday = row

    # Create a pandas DataFrame
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    calories = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
    data = pd.DataFrame({'Day': days, 'Calories Burned': calories})

    # Generate the bar chart
    plt.figure(figsize=(10, 6))
    plt.bar(data['Day'], data['Calories Burned'], color='skyblue')
    plt.title('Weekly Calories Burned')
    plt.xlabel('Day')
    plt.ylabel('Calories')
    plt.tight_layout()

    # Save the chart to a BytesIO object
    img_bytes = io.BytesIO()
    plt.savefig(img_bytes, format='png')
    img_bytes.seek(0)
    plt.close()

    return send_file(img_bytes, mimetype='image/png')
    
@app.route("/connection_status", methods=["GET"])
def check_connection():
    # Phai đăng nhập để kiểm tra trạng thái kết nối
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401
    
    # Lấy đối tượng tracker của người dùng hiện tại
    tracker = get_user_tracker()

    if tracker:
        # Gọi phương thức is_connected() của đối tượng tracker cụ thể
        status = tracker.is_connected()
        return jsonify({"connected": status}), 200
    else:
        # Không tìm thấy tracker cho người dùng này
        return jsonify({"connected": False, "message": "No active tracking session found for this user."}), 404

@app.route("/get_tracking_data", methods=["GET"])   
def get_data():
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401
    
    user_id = session['user_id']
    tracker = get_user_tracker()

    gps_data = {"calories": 0.0, "distance": 0.0} # Giá tri trị mặc định nếu không có tracker
    if tracker:
        # Lấy dữ liệu từ đối tượng tracker cụ thể
        gps_data = tracker.get_tracking_data()

    # Lấy thông tin người dùng từ database
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT caloriesCurrentday, targetCaloriesburned, congratsShownDate FROM users WHERE id = ?", (user_id,))
    user_progress = cursor.fetchone()
    conn.close()

    combined_data = {
        'calories': gps_data.get('calories', 0.0), # Lấy calories từ gps_data
        'distance': gps_data.get('distance', 0.0), # Lấy distance từ gps_data
        'currentCalories': 0,
        'targetCalories': 1, # Đặt giá trị mặc định để tránh chia cho 0
        'congratsShownToday': False
    }

    if user_progress:
        combined_data['currentCalories'] = user_progress['caloriesCurrentday'] if user_progress['caloriesCurrentday'] is not None else 0
        combined_data['targetCalories'] = user_progress['targetCaloriesburned'] if user_progress['targetCaloriesburned'] is not None else 1
        last_shown_date_str = user_progress['congratsShownDate']
        today_str = datetime.date.today().isoformat()
        combined_data['congratsShownToday'] = (last_shown_date_str == today_str) if last_shown_date_str else False
    return jsonify(combined_data), 200

@app.route("/api/mark_congrats_shown", methods=["POST"])
def mark_congrats_shown():
    if 'user_id' in session:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        today_str = datetime.date.today().isoformat()
        try:
            cursor.execute("UPDATE users SET congratsShownDate = ? WHERE id = ?", (today_str, user_id))
            conn.commit()
            conn.close()
            return jsonify({"message": "Congrats shown date updated"}), 200
        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({"error": f"Failed to update congrats shown date: {e}"}), 500
    else:
        return jsonify({"error": "User not logged in"}), 401

@app.route("/get_calories", methods=["GET"])
def get_total_calories():
    # Route này giờ lấy calories từ tracker của user
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401
    
    tracker = get_user_tracker()
    calories = 0.0
    if tracker:
        gps_data = tracker.get_tracking_data()
        calories = gps_data.get('calories', 0.0)

    return jsonify({"calories": calories}), 200

@app.route('/auth/logout', methods=['POST'])
def logout():
    # Dừng tracker của user khi đăng xuất
    stop_user_tracker()
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/stop_tracker", methods=["POST"])
def stop_tracker_route():
    if 'user_id' not in session: return jsonify({"error": "Not logged in"}), 401
    stop_user_tracker() # Gọi hàm stop tracker đã tạo ở app.py
    return jsonify({"message": "Tracker stopped"}), 200

@app.route("/api/progress_data", methods=["GET"])
def get_progress_data():
    if 'user_id' in session:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT caloriesCurrentday, targetCaloriesburned, numberOfDays FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data:
            return jsonify({
                "caloriesCurrentday": user_data['caloriesCurrentday'] if user_data['caloriesCurrentday'] else 0,
                "targetCaloriesburned": user_data['targetCaloriesburned'] if user_data['targetCaloriesburned'] else 1,
                "numberOfDays": user_data['numberOfDays'] if user_data['numberOfDays'] is not None else 0
            }), 200
        else:
            return jsonify({"error": "Could not retrieve user progress data"}), 404
    else:
        return jsonify({"error": "User not logged in"}), 401

@app.route("/api/target_calories", methods=["GET"])
def get_target_calories():
    if 'user_id' in session:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT targetCaloriesburned FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data and user_data['targetCaloriesburned'] is not None:
            return jsonify({"targetCalories": user_data['targetCaloriesburned']}), 200
        else:
            return jsonify({"error": "Could not retrieve target calories"}), 404
    else:
        return jsonify({"error": "User not logged in"}), 401
    
@app.route("/api/daily_progress", methods=["GET"])
def get_daily_progress():
    if 'user_id' in session:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT caloriesCurrentday, targetCaloriesburned FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data:
            return jsonify({
                'currentCalories': user_data['caloriesCurrentday'],
                'targetCalories': user_data['targetCaloriesburned']
            }), 200
        else:
            return jsonify({"error": "Could not retrieve daily progress data"}), 404
    else:
        return jsonify({"error": "User not logged in"}), 401


@app.route('/api/update_totals', methods=['POST'])
def update_totals():
    print('Endpoint hit')  # Add this line
    if 'user_id' in session:
        print('User logged in')  # Add this line
        user_id = session['user_id']
        data = request.get_json()
        print('Received data:', data)  # Existing debug line
        calories_burned_session = float(data.get('caloriesBurned', 0))
        distance_travelled = float(data.get('distanceTravelled', 0))
        time_tracked = float(data.get('timeTracked', 0))

        conn = get_db()
        cursor = conn.cursor()
        try:
            # Cập nhật totalKcal, totalKm, totalMin
            cursor.execute("""
                UPDATE users
                SET totalKcal = IFNULL(totalKcal, 0) + ?,
                    totalKm = IFNULL(totalKm, 0) + ?,
                    totalMin = IFNULL(totalMin, 0) + ?
                WHERE id = ?
            """, (calories_burned_session, distance_travelled, time_tracked, user_id))

            # Lấy caloriesCurrentday, lastChangecalories, numberOfDays, last_day_incremented hiện tại
            cursor.execute("SELECT caloriesCurrentday, lastChangecalories, numberOfDays, last_day_incremented FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            
            if result is None:
                conn.close()
                return jsonify({"error": "User not found"}), 404
            current_calories_day = result['caloriesCurrentday'] if result else 0
            last_change_calories = result['lastChangecalories']
            number_of_days = result['numberOfDays'] if result['numberOfDays'] is not None else 0
            last_day_incremented = result['last_day_incremented']

            # Tính toán caloriesCurrentday mới  
            new_calories_day = current_calories_day + calories_burned_session

            # Lấy ngày hiện tại
            today = datetime.datetime.now().strftime('%A') 
            print("Skibidi ahhhhh",new_calories_day, today, type(today))
            # Cập nhật lastChangecalories
            cursor.execute("UPDATE users SET lastChangecalories = ? WHERE id = ?", (today, user_id))

            # Kiểm tra và cập nhật numberOfDays và last_day_incremented
            if (last_day_incremented is None or last_day_incremented != last_change_calories) and (new_calories_day > 0):
                number_of_days += 1
                cursor.execute("UPDATE users SET numberOfDays = ?, last_day_incremented = ? WHERE id = ?",
                               (number_of_days, last_change_calories, user_id))

            # Cập nhật caloriesCurrentday
            cursor.execute("UPDATE users SET caloriesCurrentday = ? WHERE id = ?", (new_calories_day, user_id))
            
            query = f"UPDATE users SET {today} = IFNULL({today}, 0) + ? WHERE id = ?"
            cursor.execute(query, (new_calories_day, user_id))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Totals, daily calories, and day count updated successfully'}), 200
        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({'error': f'Failed to update totals: {e}'}), 500
    else:
        return jsonify({'error': 'User not logged in'}), 401
    
@app.route("/api/update_target_calories", methods=["POST"])
def update_target_calories():
    if 'user_id' in session:
        user_id = session['user_id']
        data = request.get_json()
        new_target = data.get('newTarget')

        if new_target is None or not isinstance(new_target, int) or new_target <= 0:
            return jsonify({"error": "Invalid target calorie value"}), 400

        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE users SET targetCaloriesburned = ? WHERE id = ?", (new_target, user_id))
            conn.commit()
            conn.close()
            return jsonify({"message": "Target calories updated successfully"}), 200
        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({"error": f"Failed to update target calories: {e}"}), 500
    else:
        return jsonify({"error": "User not logged in"}), 401

@app.route('/change_password', methods=['POST'])
def change_password():
    if 'user_id' not in session:
        return jsonify({"error": "User not logged in"}), 401

    user_id = session['user_id']
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_new_password = data.get('confirm_new_password')

    if not current_password or not new_password or not confirm_new_password:
        return jsonify({"error": "Missing password fields"}), 400

    if new_password != confirm_new_password:
        return jsonify({"error": "New passwords do not match"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE id = ?", (user_id,))
    user_data = cursor.fetchone()

    if not user_data or not check_password_hash(user_data['password'], current_password):
        conn.close()
        return jsonify({"error": "Incorrect current password"}), 401

    hashed_new_password = generate_password_hash(new_password)
    try:
        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_new_password, user_id))
        conn.commit()
        conn.close()
        return jsonify({"message": "Password updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"Failed to update password: {e}"}), 500
    
if __name__ == "__main__":
    app.run(debug=True)