let trackingInterval;
let connectionStatusInterval; // Interval cho việc kiểm tra trạng thái kết nối
let startTime;
let congratsShownThisSession = false;
let jsConfettiInstance = null; // Đổi tên để tránh nhầm lẫn scope
let congratsContainer; //Khai báo ở phạm vi toàn cục
let lastFetchedCalories = 0.0; // Biến lưu trữ tổng calories lần cuối lấy được từ backend
let startButton = null; // Khai báo biến startButton để khai báo ở nhiều hàm

document.addEventListener('DOMContentLoaded', () => {
    // Gán lại biến startButton sau khi DOM đã sẵn sàng
    startButton = document.querySelector('.track-button');
    const endButton = document.querySelector('.end-button');
    const ipAddressInput = document.getElementById('ipAddress');
    const caloriesDisplay = document.getElementById('current-calories');
    const distanceDisplay = document.getElementById('current-distance');
    const timeDisplay = document.getElementById('current-time');
    congratsContainer = document.getElementById('congrats-container');
    jsConfettiInstance = new JSConfetti(); // Khởi tạo đối tượng và gán vào biến phạm vi rộng

    // Kiểm tra trạng thái kết nối ngay khi load trang
    checkConnectionStatusOnLoad();

    // --- Các hàm xử lý trạng thái nút ---
    function setButtonStateConnecting() {
        console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] setButtonStateConnecting called.`); // Log thời gian gọi hàm
        startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        startButton.style.backgroundColor = 'gold'; // Màu vàng cho trạng thái đang chờ
        startButton.style.color = '#333';
        startButton.disabled = true; // Vô hiệu hóa khi đang kết nối
        startButton.classList.remove('failed'); // Xóa class 'failed' nếu có
    }

    function setButtonStateSuccess() {
        
        startButton.innerHTML = '<i class="fas fa-check-circle"></i> Tracking Started';
        startButton.style.backgroundColor = '#28a745'; // Màu xanh lá khi thành công
        startButton.style.color = 'white';
        startButton.disabled = true; // Vẫn vô hiệu hóa vì đang tracking
        startButton.classList.remove('failed');
    }

    function setButtonStateFailed(message = 'Lost Connection') {
        console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] setButtonStateFailed called with message: "${message}"`); // Log thời gian gọi hàm và thông báo
        startButton.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        startButton.style.backgroundColor = ''; // Reset về CSS mặc định hoặc dùng class
        startButton.style.color = ''; // Reset về CSS mặc định hoặc dùng class
        startButton.disabled = false; // Cho phép nhấp lại để thử
        startButton.classList.add('failed'); // Thêm class 'failed' để CSS định dạng màu đỏ
    }

    function setButtonStateIdle() {
        startButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
        startButton.style.backgroundColor = ''; // Dùng màu mặc định từ CSS
        startButton.style.color = ''; // Dùng màu mặc định từ CSS
        startButton.disabled = false; // Cho phép bắt đầu
        startButton.classList.remove('failed'); // Xóa class 'failed'
    }

    // Hàm kiểm tra trạng thái kết nối, cho dùng interval polling
    async function checkConnectionStatus() {
        console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Start. Current trackingInterval: ${trackingInterval ? 'Active' : 'Null'}, connectionStatusInterval: ${connectionStatusInterval ? 'Active' : 'Null'}`); // Log trạng thái interval ban đầu            
        try {
            const response = await fetch('/connection_status');
            
            // Kiểm tra nếu response không OK (lỗi HTTP 4xx, 5xx)
            if (!response.ok) {
                console.error(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Fetch failed. Status:`, response.status);
                // ... (xử lý lỗi 401 và các lỗi khác) ...                    
                if (response.status === 401) {
                    alert("Session expired. Please log in again.");
                    window.location.href = '/login';
                    return; // Dừng hàm
                }
                // Nếu lỗi khác, chuyển trạng thái lỗi và dừng interval
                setButtonStateFailed('Server Error checking connection');
                if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Cleared trackingInterval due to fetch error.`); }
                if (connectionStatusInterval) { clearInterval(connectionStatusInterval); connectionStatusInterval = null; console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Cleared connectionStatusInterval due to fetch error.`); }
                return;
            }
        
            // Nếu response OK (Status 2xx), đọc dữ liệu JSON
            const data = await response.json();
            console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Received data.connected: ${data.connected}. Button classList: ${startButton.classList}`); // Log trạng thái nhận được và class nút
                
            if (data.connected) {
                // Nếu backend báo đã kết nối THÀNH CÔNG (connected: true)
                console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Backend connected.`);
                // Chuyển trạng thái nút sang Success NẾU nó chưa ở trạng thái đó
                if (!startButton.innerHTML.includes('Tracking Started')) {
                    setButtonStateSuccess();
                    console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Button state set to Success.`);
                }
        
                // Bắt đầu interval lấy dữ liệu NẾU nó chưa chạy
                if (!trackingInterval) {
                    console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Starting tracking data fetch interval.`);
                    // Đặt lại thời gian bắt đầu khi kết nối thành công
                    // Chỉ reset startTime LẦN ĐẦU tiên kết nối thành công trong phiên này
                    if (startTime === undefined || startTime === null) {
                        startTime = new Date();
                        console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: startTime reset.`);
                    }
                    trackingInterval = setInterval(fetchTrackingData, 3000); // Bắt đầu lấy dữ liệu mỗi 3 giây
                }
    
            } else { // data.connected === false
                // Nếu backend báo CHƯA kết nối (connected: false), bao gồm cả mất kết nối sau này
                // Chuyển trạng thái nút sang Failed NẾU nó chưa ở trạng thái Failed
                // (Kiểm tra class 'failed' đáng tin cậy hơn innerHTML)

                console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Backend NOT connected.`);
                if (!startButton.classList.contains('failed')) {
                    setButtonStateFailed('Lost Connection');
                    console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Button state set to Failed.`);
                    }
        
                    // Dừng interval lấy dữ liệu NẾU nó đang chạy
                    if (trackingInterval) {
                        console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Clearing tracking data fetch interval.`); // Log trước khi clear
                        clearInterval(trackingInterval);
                        trackingInterval = null;
                        console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: trackingInterval is now: ${trackingInterval}.`); // Log sau khi clear
                    }
        
                    // connectionStatusInterval sẽ tiếp tục chạy để thử kết nối lại
                }
        
            } catch (error) {
                console.error(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Error:`, error);
                setButtonStateFailed('Network Error');
                if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Cleared trackingInterval due to error.`); }
                if (connectionStatusInterval) { clearInterval(connectionStatusInterval); connectionStatusInterval = null; console.log(`[${new Date().toLocaleTimeString()}] checkConnectionStatus: Cleared connectionStatusInterval due to error.`); }
            }
        }

    // Hàm kiểm tra trạng thái kết nối MỘT LẦN khi trang load
    async function checkConnectionStatusOnLoad() {
        try {
           const response = await fetch('/connection_status');
           if (response.ok) {
               const data = await response.json();
               if (data.connected) {
                   // Nếu backend báo đã kết nối khi load trang
                   setButtonStateSuccess(); // Đặt nút thành Tracking Started
                   startTime = new Date(); // Cần đảm bảo startTime được thiết lập lại
                   trackingInterval = setInterval(fetchTrackingData, 3000); // Bắt đầu lấy dữ liệu
                   // Bắt đầu interval kiểm tra trạng thái kết nối liên tục
                   if (!connectionStatusInterval) {
                       connectionStatusInterval = setInterval(checkConnectionStatus, 5000);
                   }
               } else {
                    // Nếu backend báo chưa kết nối khi load trang
                   setButtonStateIdle(); // Đặt nút về trạng thái ban đầu
               }
           } else {
               console.error('Failed to fetch initial connection status.');
               setButtonStateIdle(); // Mặc định về trạng thái ban đầu nếu không fetch được
           }
       } catch (error) {
           console.error('Error fetching initial connection status:', error);
           setButtonStateIdle(); // Mặc định về trạng thái ban đầu nếu có lỗi
       }
   }

    async function startTracking() {
        console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] startTracking called.`); // Log thời gian bắt đầu hàm
        
        const ipAddress = ipAddressInput.value.trim();
        if (!ipAddress) {
             alert('Please enter iPhone IP address.');
             return;
        }
        //const userEmail = localStorage.getItem('userEmail'); // Email không cần thiết ở đây nữa, backend dùng session['user_id']

        // if (!userEmail) {
           // alert('User email not found. Please log in again.');
            // window.location.href = '/login';
            // return;
        //}

        // Backend API /register_ip giờ yêu cầu user đăng nhập
        // Nên không cần kiểm tra email ở đây nữa, backend sẽ kiểm tra user_id trong session

        setButtonStateConnecting(); // Đặt trạng thái đang kết nối

        // Reset hiển thị khi bắt đầu hoặc thử lại
        // Không reset startTime ở đây nữa, sẽ reset khi checkConnectionStatus xác nhận Connected
        //startTime = new Date();
        caloriesDisplay.textContent = '0 kcal';
        distanceDisplay.textContent = '0 km';
        timeDisplay.textContent = '0:00:00';
        lastFetchedCalories = 0.0; // Reset biến lưu tổng calories
        congratsShownThisSession = false; // Reset cờ hiển thị chúc mừng

        // Dừng interval cũ nếu có (trường hợp thử lại sau lỗi hoặc nhấn Start lại)
        clearInterval(trackingInterval);
        trackingInterval = null;
        clearInterval(connectionStatusInterval);
        connectionStatusInterval = null;

        try {
            console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] Fetching /register_ip...`); // Log trước khi fetch
            const response = await fetch('/register_ip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Chỉ cần gửi iphone_ip. Backend sẽ dùng session['user_id']
                body: JSON.stringify({ iphone_ip: ipAddress}),
            });
            console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] /register_ip fetch finished. Status: ${response.status}`); // Log sau khi fetch xong

            if (response.ok) {
                const responseData = await response.json();
                console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] /register_ip response OK. Data status: ${responseData.status}`); // Log status từ data

                // Dù backend báo 'success' ở đây, nó chỉ có nghĩa là luồng theo dõi đã được khởi tạo.
                // Trạng thái 'Connected' thực sự sẽ được xác nhận qua interval checkConnectionStatus.
                
                if (responseData.status === 'success') {
                    // Bắt đầu interval kiểm tra trạng thái kết nối ngay sau khi khởi tạo luồng thành công
                    // interval này sẽ tự động chuyển trạng thái nút và bắt đầu fetchTrackingData khi kết nối thành công
                    if(!connectionStatusInterval) { // Tránh tạo trùng nếu đã tồn tại
                        connectionStatusInterval = setInterval(checkConnectionStatus, 5000); // Kiểm tra mỗi 5 giây
                        console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] connectionStatusInterval started.`); // Log khi interval bắt đầu
                    }

                    console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] Calling checkConnectionStatus immediately.`); // Log trước khi gọi tức thời
                    //checkConnectionStatus(); // Gọi hàm kiểm tra trạng thái LẦN ĐẦU TIÊN NGAY LẬP TỨC

                    //setButtonStateSuccess(); đã được gọi ở đầu hàm
                    
                } else {
                    // Nếu backend báo lỗi ngay từ bước khởi tạo (ví dụ: lỗi server 500)
                    alert(`Error starting tracking: ${responseData.message || 'Failed to start tracking.'}`);
                    setButtonStateFailed(); // Chuyển về trạng thái Failed thay vì reset
                }

            } else {
                // Nếu request /register_ip trả về lỗi HTTP khác 200 (ví dụ: 400, 401, 500)
                const errorData = await response.json();
                console.log(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] /register_ip fetch non-OK status.`);
                alert(`Error starting tracking: ${errorData.error || 'Something went wrong with the request.'}`);
                // Nếu lỗi là do chưa đăng nhập (401), có thể chuyển hướng
                if (response.status === 401) {
                    alert("Session expired or user not logged in. Redirecting to login.");
                    window.location.href = '/login';
                } else {
                    setButtonStateFailed(); // Chuyển về trạng thái Failed
                }
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString('en-US', {hour12: false, second: '2-digit', fractionalSecondDigits: 3})}] /register_ip fetch error:`, error);
            setButtonStateFailed('Failed to communicate with the server.'); // Lỗi mạng
        }
    }        

    async function fetchTrackingData() {
        try {
            const response = await fetch('/get_tracking_data');
            if (response.ok) {
                const data = await response.json();
                // Cập nhật hiển thị GPS data
                caloriesDisplay.textContent = `${parseFloat(data.calories).toFixed(2)} kcal`;
                distanceDisplay.textContent = `${parseFloat(data.distance/1000).toFixed(2)} km`;

                // Lưu lại tổng calories mới nhất
                lastFetchedCalories = parseFloat(data.calories);

                // Cập nhật thời gian chạy
                const currentTime = new Date();
                const elapsedTime = Math.floor((currentTime - startTime) / 1000);
                const hours = Math.floor(elapsedTime / 3600);
                const minutes = Math.floor((elapsedTime % 3600) / 60);
                const seconds = elapsedTime % 60;
                timeDisplay.textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                // Logic hiển thị chúc mừng
                const currentSessionCalories = parseFloat(data.calories); // Calories từ phiên theo dõi hiện tại (từ gps_tracker instance)
                const caloriesCurrentday = parseFloat(data.currentCalories); // Calories đã lưu trong DB cho ngày hôm nay
                const targetCalories = parseFloat(data.targetCalories);
                const congratsShownToday = data.congratsShownToday; // Lấy trạng thái đã hiển thị trong ngày từ backend

                console.log('totalCaloriesBurned:', currentSessionCalories + caloriesCurrentday);
                console.log('targetCalories:', targetCalories);
                console.log('congratsShownToday (backend):', congratsShownToday);
                console.log('congratsShownThisSession (frontend):', congratsShownThisSession);

                // Điều kiện hiển thị chúc mừng: (Tổng calories >= Mục tiêu) VÀ (Chưa hiển thị trong ngày theo DB) VÀ (Chưa hiển thị trong phiên hiện tại)
                if ((currentSessionCalories + caloriesCurrentday) >= targetCalories && !congratsShownToday && !congratsShownThisSession) {
                    congratsContainer.classList.add('active');
                    console.log('Giá trị của jsConfetti trước khi shoot:', jsConfetti); // Thêm dòng này
                    
                    if (jsConfettiInstance) {
                        jsConfettiInstance.addConfetti();
                    }
                    // if (jsConfetti && typeof jsConfetti.shoot === 'function') { // Kiểm tra jsConfetti và phương thức shoot
                    //     console.log('Shooting confetti!'); 
                    //     jsConfetti.shoot(); }
                    congratsShownThisSession = true; // Đánh dấu đã hiển thị trong phiên này
                    console.log('Giá trị của jsConfetti sau khi shoot:', jsConfetti.shoot); // Thêm dòng này

                    // Gửi request lên backend để cập nhật congratsShownDate
                    fetch('/api/mark_congrats_shown', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({})
                    });
                }
            } else {
                // Xử lý lỗi fetch tracking data (ví dụ: 401 Unauthorized, 404 Not Found, 500 Internal Error)
                console.error('Failed to fetch tracking data. Status:', response.status);
                 // Nếu lỗi là 401, có thể session hết hạn
                 if (response.status === 401) {
                     alert("Session expired. Please log in again.");
                     window.location.href = '/login';
                 } else {
                     // Nếu lỗi khác, có thể do backend tracker bị lỗi hoặc ngắt kết nối đột ngột
                     // checkConnectionStatus interval sẽ giúp phát hiện và cập nhật trạng thái nút
                }
            }
        } catch (error) {
            console.error('Error fetching tracking data:', error);
            // Lỗi mạng khi fetch, checkConnectionStatus interval sẽ giúp phát hiện
        }
    }
    
    function endTracking() {
        if (confirm('Are you sure you want to end the tracking session?')) {
            
  
            //Dừng 2 interval
            clearInterval(trackingInterval);
            trackingInterval = null;
            clearInterval(connectionStatusInterval);
            connectionStatusInterval = null;
          
            // Get current values before resetting
            const currentCaloriesStr = caloriesDisplay.textContent;
            const currentCalories = parseFloat(currentCaloriesStr.replace(' kcal', ''));

            const currentDistanceStr = distanceDisplay.textContent;
            const currentDistance = parseFloat(currentDistanceStr.replace(' km', ''));

            const currentTimeStr = timeDisplay.textContent;
            const timeParts = currentTimeStr.split(':');
            const currentTotalSeconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
            const currentTotalMinutes = currentTotalSeconds / 60;
            
            // Reset hiển thị
            caloriesDisplay.textContent = '0 kcal';
            distanceDisplay.textContent = '0 km';
            timeDisplay.textContent = '0:00:00';
            lastFetchedCalories = 0.0; // Reset biến lưu trữ
            congratsShownThisSession = false; // Reset cờ hiển thị chúc mừng
          
           
            startTime = null; // Đặt lại thời gian bắt đầu

            resetStartButton(); // Đặt lại trạng thái nút về ban đầu    

            alert('Tracking session ended.');
          
            // Gửi lượng calories đã đốt lên backend
            // Backend /api/update_calories cộng dồn giá trị nhận được
            // Nên gửi tổng calories đã đốt được trong phiên là hợp lý với logic backend hiện tại
            
            
      
            
            console.log('Dữ liệu gửi đi:', {
                caloriesBurned: currentCalories,
                distanceTravelled: currentDistance,
                timeTracked: currentTotalMinutes
            });
            // Gửi lượng calories đã đốt lên backend
            fetch('/api/update_totals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    caloriesBurned: currentCalories,
                    distanceTravelled: currentDistance,
                    timeTracked: currentTotalMinutes,
                }),
            })
      
            .then(response => {
                if (response.ok) {
                    console.log('Calories updated successfully on the server.');
                } else {
                    console.error('Failed to update calories on the server.');
                }
            })
            .catch(error => {
                console.error('Error sending update calories request:', error);
            });
        }    

        stop_user_tracker(); // Gọi hàm dừng tracker frontend
    }
    
    function resetStartButton() {
        setButtonStateIdle(); // Đặt lại trạng thái nút về ban đầu
    }

    // Sự kiện click cho nút Logout (nếu có)
    const logoutButton = document.querySelector('.btnLogin-popup');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ <a>

            // Dừng tracker của backend khi logout
            stop_user_tracker(); // Gọi hàm stop tracker frontend, bạn có thể thêm API call logout ở đây nếu auth.py không tự làm điều đó

            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                });

                if (response.ok) {
                    // Xóa session user_id frontend (nếu có lưu)
                    localStorage.removeItem('userEmail'); // Nếu có lưu email ở localStorage
                    // Dừng các intervals đang chạy
                    clearInterval(trackingInterval);
                    trackingInterval = null;
                    clearInterval(connectionStatusInterval);
                    connectionStatusInterval = null;
                    // Reset trạng thái nút và hiển thị
                    resetStartButton();
                    caloriesDisplay.textContent = '0 kcal';
                    distanceDisplay.textContent = '0 km';
                    timeDisplay.textContent = '0:00:00';
                    lastFetchedCalories = 0.0;
                    congratsShownThisSession = false;
                    
                    window.location.href = '/'; // Chuyển hướng về firstpage.html
                } else {
                    const errorData = await response.json();
                    alert(`Logout failed: ${errorData.error || 'Something went wrong'}`);
                    console.error('Logout failed:', errorData);
                }
            } catch (error) {
                alert('An error occurred during logout.');
                console.error('Logout error:', error);
            }
        });
    }

    // Hàm để gọi API dừng tracker ở backend khi user logout hoặc đóng trình duyệt
    // Có thể gọi nó khi logout
    async function stop_user_tracker() {
        try {
            const response = await fetch('/stop_tracker', { // Giả định có endpoint này
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                console.log("Backend tracker stopped.");
            } else {
                console.error("Failed to stop backend tracker. Status:", response.status);
            }
        } catch (error) {
            console.error("Network error stopping backend tracker:", error);
        }
   }
    // Gắn các hàm vào window để có thể gọi từ thuộc tính 'onclick' trong HTML
    window.startTracking = startTracking;
    window.endTracking = endTracking;
    // window.closeCongrats = closeCongrats;

    window.closeCongrats = () => {
        const congratsMessage = document.getElementById('congrats-container');
        congratsMessage.classList.remove('active');
        //document.querySelectorAll('.confetti').forEach(c => c.remove()); // jsConfetti tự dọn dẹp

        // Gọi API để cập nhật congratsShownDate khi người dùng đóng thông báo
        fetch('/api/mark_congrats_shown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
    };

     // Khởi động interval để lấy dữ liệu (nếu tracking đã bắt đầu)
    const isTrackingActive = document.querySelector('.track-button').innerHTML.includes('Tracking Started');
    if (isTrackingActive) {
        startTime = new Date(); // Cần đảm bảo startTime được thiết lập khi bắt đầu tracking
        trackingInterval = setInterval(fetchTrackingData, 3000);
    }
});