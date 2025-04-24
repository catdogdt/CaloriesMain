import socket
import math
import time
import threading
import datetime

# Constants
CALORIES_PER_METER_WALK = 0.04
CALORIES_PER_METER_RUN = 0.08
SPEED_THRESHOLD = 2   # m/s (sẽ không còn được sử dụng trực tiếp để hiển thị)
PORT = 11123
MOVEMENT_THRESHOLD = 3
UPDATE_INTERVAL = 3 # Có thể giữ hoặc điều chỉnh thời gian cập nhật

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c *1000 # metres

def parse_nmea_gprmc(nmea_sentence):
    parts = nmea_sentence.split(",")
    if parts[0] != "$GPRMC":
        return None, None, None

    lat_raw = parts[3]
    lat_dir = parts[4]
    lon_raw = parts[5]
    lon_dir = parts[6]
    speed_knots = parts[7]

    if not lat_raw or not lon_raw:
        return None, None, None
    
    try:
        lat_deg = int(float(lat_raw) / 100)
        lat_min = float(lat_raw) % 100 / 60
        latitude = lat_deg + lat_min
        if lat_dir == 'S':
            latitude = -latitude

        lon_deg = int(float(lon_raw) / 100)
        lon_min = float(lon_raw) % 100 / 60
        longitude = lon_deg + lon_min
        if lon_dir == 'W':
            longitude = -longitude
            
        speed_mps = float(speed_knots) * 0.51444 if speed_knots else 0
        return latitude, longitude, speed_mps
    
    except ValueError:    
        
        return None, None, None # Handle potential errors during float conversion

class GPSTracker:
    def __init__(self, iphone_ip):
        self.iphone_ip = iphone_ip
        self.total_calories = 0.0
        self.total_distance = 0.0
        self._connection_status = False
        self.previous_lat = None
        self.previous_lon = None
        self.previous_time = None
        self._running = True # Cờ để kiểm soát vòng lặp chạy hay dừng
        self._socket = None
        self._lock = threading.Lock() # Sử dụng Lock để truy cập an toàn vào biến

        print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker initialized for {self.iphone_ip}") # Log khởi tạo

    def set_connection_status(self, status):
        with self._lock:
            if self._connection_status != status:
                self._connection_status = status
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: !!! Connection status CHANGED to {status} !!!") # Log nổi bật khi trạng thái thay đổi

    def is_connected(self):
        with self._lock:
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: is_connected() called. Currently returning {self._connection_status}") # Log mỗi lần hàm được gọi và giá trị trả về
            return self._connection_status

    def run_tracking_loop(self):
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Run loop started for {self.iphone_ip}") # Log khi vòng lặp bắt đầu
        self._running = True # Đảm bảo cờ running là True khi bắt đầu

         # Đặt trạng thái ban đầu là False
        self.set_connection_status(False)
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: Initial status set to False.")

        while self._running:
            try:
                if not self._socket:
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Attempting to connect to GPS2IP at {self.iphone_ip}:{PORT}")
                    self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self._socket.settimeout(5) # Đặt timeout cho kết nối
                    self._socket.connect((self.iphone_ip, PORT))
                    self._socket.settimeout(None) # Bỏ timeout sau khi kết nối thành công
                    self.set_connection_status(True) # <<< Đặt True khi kết nối thành công >>>
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Connected to GPS2IP at {self.iphone_ip}:{PORT}")

                data = self._socket.recv(1024)
                if not data:
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: Data empty (connection lost). Preparing to set status to False.")
                    self.set_connection_status(False) # <<< Đặt False khi nhận data rỗng >>>
                    self._close_socket(); time.sleep(5); continue # Đóng socket và đợi


                gps_data = data.decode("utf-8").strip()
                print("Received GPS Dat for {self.iphone_ip}", gps_data) #in ra để kiểm tra

                latitude, longitude, speed_mps = parse_nmea_gprmc(gps_data)

                if latitude is not None and longitude is not None:
                    current_time = time.time()
                    if self.previous_lat is not None and self.previous_lon is not None:
                        distance = haversine(self.previous_lat, self.previous_lon, latitude, longitude)
                        time_elapsed = current_time - self.previous_time

                        if time_elapsed > 0 and distance > MOVEMENT_THRESHOLD:
                            if speed_mps < SPEED_THRESHOLD:
                                calories_burned = distance * CALORIES_PER_METER_WALK
                            else:
                                calories_burned = distance * CALORIES_PER_METER_RUN
                            with self._lock:
                                self.total_calories += calories_burned
                                self.total_distance += distance

                    self.previous_lat, self.previous_lon = latitude, longitude
                    self.previous_time = current_time

                    print(f"Total Distance: {self.total_distance:.2f} meters")
                    print(f"Total Calories Burned: {self.total_calories:.2f} kcal\n")

                else:
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Invalid GPS data received for {self.iphone_ip}.")

                time.sleep(UPDATE_INTERVAL)

            except socket.timeout:
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: Socket timeout. Preparing to set status to False.")
                self.set_connection_status(False) # <<< Đặt False khi timeout >>>
                self._close_socket(); time.sleep(5); # Đóng socket và đợi

            except Exception as e:
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Tracker {self.iphone_ip}: Exception in loop ({e}). Preparing to set status to False.")
                self.set_connection_status(False) # <<< Đặt False khi có Exception khác >>>
                self._close_socket(); time.sleep(5); # Đóng socket và đợi

        # Dọn vòng lặp khi kết thúc vòng lặp
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Run loop stopped for {self.iphone_ip}")
        self.set_connection_status(False) # Đặt False khi vòng lặp dừng hẳn
        self._close_socket()

    def _close_socket(self):
        if self._socket:
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Closing socket for {self.iphone_ip}")
            try:
                self._socket.close()
            except Exception as e:
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Error closing socket for {self.iphone_ip}: {e}")
            finally:
                self._socket = None

    def stop(self):
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')}] Stopping tracker for {self.iphone_ip} requested.")
        self._running = False # Đặt cờ running là False để dừng vòng lặp
        self._socket_close()# Tắt socket có thể giúp thoát vòng lặp blocking recv()

    def is_connected(self):
        with self._lock:
            return self._connection_status

    def get_tracking_data(self):
        with self._lock:
            # Trả về bản sao của dữ liệu để tránh thay đổi ngoài ý muốn
            return {"calories": self.total_calories, "distance": self.total_distance}