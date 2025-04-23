# app.py
from flask import Flask, request, jsonify, render_template, session, redirect
from flask_cors import CORS
from auth import auth
from gps_tracker import start_gps_tracking, get_tracking_data, is_connected
from threading import Thread
import sqlite3
import socket
import time  # Import thư viện time
import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key'
import os
DATABASE = os.path.abspath('database.db')

CORS(app, resources={r"/*": {"origins": "*"}})
app.register_blueprint(auth, url_prefix="/auth")

user_ips = {}
tracking_threads = {}

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn
    
def get_user_info(user_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT email, targetCaloriesburned AS goal FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    db.close()
    if user:
        return dict(user)
    else:
        return None

def reset_daily_calories():
    now = datetime.datetime.now()
    if now.hour == 0 and now.minute == 0:
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute("UPDATE users SET caloriesCurrentday = 0")
            db.commit()
            db.close()
            print("🔄 Daily calories reset at midnight.")

# Initialize the scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(reset_daily_calories, 'cron', hour=0, minute=0)
scheduler.start()


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
            return render_template('profile.html', user=user_data)
        else:
            return render_template('profile.html', error="Could not load profile information.")
    else:
        return redirect('/login')

@app.route('/dashboard')
def dashboard_page():
    return render_template('firstpage.html')

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

        time.sleep(3)  # Chờ 3 giây để xem kết nối có thành công không

        if is_connected() and user_ips.get(email) == iphone_ip:
            print("✅ GPS Tracking Started (after wait)")
            return jsonify({"status": "success", "message": "GPS tracking started"}), 200
        else:
            print("❌ Failed to start GPS tracking (after wait)")
            return jsonify({"status": "error", "message": "Không thể kết nối với thiết bị sau một khoảng thời gian. Hãy đảm bảo thiết bị đã bật và địa chỉ IP chính xác."}), 200

    except Exception as e:
        print(f"❌ Error Starting GPS Tracking: {e}")
        return jsonify({"status": "error", "message": f"Lỗi khi bắt đầu theo dõi GPS: {e}"}), 500
    

@app.route("/get_tracking_data", methods=["GET"])
def get_data():
    data = get_tracking_data()
    if 'user_id' in session:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT caloriesCurrentday, targetCaloriesburned, congratsShownDate FROM users WHERE id = ?", (user_id,))
        user_progress = cursor.fetchone()
        conn.close()
        if user_progress:
            data['currentCalories'] = user_progress['caloriesCurrentday'] if user_progress['caloriesCurrentday'] is not None else 0
            data['targetCalories'] = user_progress['targetCaloriesburned'] if user_progress['targetCaloriesburned'] is not None else 1
            last_shown_date_str = user_progress['congratsShownDate']
            today_str = datetime.date.today().isoformat()
            data['congratsShownToday'] = (last_shown_date_str == today_str) if last_shown_date_str else False
    return jsonify(data), 200

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
    tracking_data = get_tracking_data()
    calories = tracking_data.get("calories", 0)
    return jsonify({"calories": calories}), 200

@app.route("/check-connection", methods=["GET"])
def check_connection():
    status = "Connected" if is_connected() else "Not Connected"
    return jsonify({"status": status})

@app.route('/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully"}), 200

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

# @app.route("/api/update_calories", methods=["POST"])
# def update_calories():
#     if 'user_id' in session:
#         user_id = session['user_id']
#         data = request.get_json()
#         calories_burned = data.get('caloriesBurned', 0)

#         conn = get_db()
#         cursor = conn.cursor()
#         try:
#             # Lấy giá trị hiện tại của caloriesCurrentday
#             cursor.execute("SELECT caloriesCurrentday FROM users WHERE id = ?", (user_id,))
#             result = cursor.fetchone()
#             current_calories = result['caloriesCurrentday'] if result and result['caloriesCurrentday'] is not None else 0

#             # Cộng calories đã đốt vào giá trị hiện tại
#             new_calories = current_calories + calories_burned

#             # Cập nhật giá trị mới vào database
#             cursor.execute("UPDATE users SET caloriesCurrentday = ? WHERE id = ?", (new_calories, user_id))
#             conn.commit()
#             conn.close()
#             return jsonify({"message": "Calories updated successfully"}), 200
#         except Exception as e:
#             conn.rollback()
#             conn.close()
#             return jsonify({"error": f"Failed to update calories: {e}"}), 500
#     else:
#         return jsonify({"error": "User not logged in"}), 401

# @app.route("/api/update_calories", methods=["POST"])
# def update_calories():
#     if 'user_id' in session:
#         user_id = session['user_id']
#         data = request.get_json()
#         calories_burned = data.get('caloriesBurned', 0)

#         conn = get_db()
#         cursor = conn.cursor()
#         try:
#             cursor.execute("SELECT caloriesCurrentday, streak, last_calorie_update FROM users WHERE id = ?", (user_id,))
#             result = cursor.fetchone()
#             if result is None:
#                 conn.close()
#                 return jsonify({"error": "User not found"}), 404
#             current_calories = result['caloriesCurrentday'] if result['caloriesCurrentday'] is not None else 0
#             streak = result['streak'] if result['streak'] is not None else 0
#             last_update_str = result['last_calorie_update']

#             new_calories = current_calories + calories_burned

#             cursor.execute("UPDATE users SET caloriesCurrentday = ? WHERE id = ? ", (new_calories, user_id))

#             today_str = datetime.date.today().isoformat()

#             if new_calories > 0:
#                 if last_update_str == today_str:
#                     # Cập nhật trong cùng một ngày, không tăng streak
#                     pass
#                 elif last_update_str != today_str:
#                     streak += 1
#             else:
#                 streak = 0

#             cursor.execute("UPDATE users SET caloriesCurrentday = ?, streak = ?, last_calorie_update = ? WHERE id = ?", (new_calories, streak, today_str, user_id))

#             conn.commit()
#             conn.close()
#             return jsonify({"message": "Calories updated successfully"}), 200
#         except Exception as e:
#             conn.rollback()
#             conn.close()
#             return jsonify({"error": f"Failed to update calories: {e}"}), 500
#     else:
#         return jsonify({"error": "User not logged in"}), 401


@app.route("/api/update_calories", methods=["POST"])
def update_calories():
    if 'user_id' in session:
        user_id = session['user_id']
        data = request.get_json()
        calories_burned = data.get('caloriesBurned', 0)

        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT caloriesCurrentday, numberOfDays, last_day_incremented FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            if result is None:
                conn.close()
                return jsonify({"error": "User not found"}), 404
            current_calories = result['caloriesCurrentday'] if result['caloriesCurrentday'] is not None else 0
            number_of_days = result['numberOfDays'] if result['numberOfDays'] is not None else 0
            last_incremented = result['last_day_incremented']

            new_calories = current_calories + calories_burned
            cursor.execute("UPDATE users SET caloriesCurrentday = ? WHERE id = ?", (new_calories, user_id))

            today_str = datetime.date.today().isoformat()

            if new_calories > 0:
                if last_incremented != today_str:
                    number_of_days += 1
                    cursor.execute("UPDATE users SET numberOfDays = ?, last_day_incremented = ? WHERE id = ?", (number_of_days, today_str, user_id))
                # else:
                #     # Đã tăng numberOfDays trong ngày hôm nay rồi
            # elif new_calories == 0:
            #     # Tùy chọn: reset last_day_incremented?

            conn.commit()
            conn.close()
            return jsonify({"message": "Calories updated successfully"}), 200
        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({"error": f"Failed to update calories: {e}"}), 500
    else:
        return jsonify({"error": "User not logged in"}), 401
 
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