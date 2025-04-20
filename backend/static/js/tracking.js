document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector('.track-button');
    const endButton = document.querySelector('.end-button');
    const ipAddressInput = document.getElementById('ipAddress');
    const caloriesDisplay = document.getElementById('current-calories');
    const distanceDisplay = document.getElementById('current-distance');
    const timeDisplay = document.getElementById('current-time');
    let trackingInterval;
    let startTime;

    async function startTracking() {
        const ipAddress = ipAddressInput.value.trim();
        const userEmail = localStorage.getItem('userEmail');

        if (!userEmail) {
            alert('User email not found. Please log in again.');
            window.location.href = '/login';
            return;
        }

        startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        startButton.style.backgroundColor = 'gold';
        startButton.style.color = '#333';
        startButton.disabled = true;
        startTime = new Date();
        caloriesDisplay.textContent = '0 kcal';
        distanceDisplay.textContent = '0 km';
        timeDisplay.textContent = '0:00:00';

        try {
            const response = await fetch('/register_ip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ iphone_ip: ipAddress, email: userEmail }),
            });

            if (response.ok) {
                startButton.innerHTML = '<i class="fas fa-check-circle"></i> Tracking Started';
                startButton.style.backgroundColor = '#28a745';
                startButton.style.color = 'white';
                trackingInterval = setInterval(fetchTrackingData, 3000); // Cập nhật mỗi 3 giây
            } else {
                const errorData = await response.json();
                alert(`Error starting tracking: ${errorData.error || 'Something went wrong'}`);
                startButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
                startButton.style.backgroundColor = '';
                startButton.style.color = '';
                startButton.disabled = false;
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            alert('Failed to connect to the server.');
            startButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
            startButton.style.backgroundColor = '';
            startButton.style.color = '';
            startButton.disabled = false;
        }
    }

    async function fetchTrackingData() {
        try {
            const response = await fetch('/get_tracking_data');
            if (response.ok) {
                const data = await response.json();
                caloriesDisplay.textContent = `${data.calories.toFixed(2)} kcal`;
                distanceDisplay.textContent = `${(data.distance / 1000).toFixed(2)} km`;

                const currentTime = new Date();
                const elapsedTime = Math.floor((currentTime - startTime) / 1000);
                const hours = Math.floor(elapsedTime / 3600);
                const minutes = Math.floor((elapsedTime % 3600) / 60);
                const seconds = elapsedTime % 60;
                timeDisplay.textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            } else {
                console.error('Failed to fetch tracking data.');
            }
        } catch (error) {
            console.error('Error fetching tracking data:', error);
        }
    }

    function endTracking() {
        if (confirm('Are you sure you want to end the tracking session?')) {
            clearInterval(trackingInterval);
            startButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
            startButton.style.backgroundColor = '';
            startButton.style.color = '';
            startButton.disabled = false;
            caloriesDisplay.textContent = '0 kcal';
            distanceDisplay.textContent = '0 km';
            timeDisplay.textContent = '0:00:00';
            alert('Tracking session ended.');
            // Nếu cần, bạn có thể gọi một API ở đây để báo cho backend dừng tracking
            // Ví dụ:
            // fetch('/api/end_tracking', { method: 'POST' });
        }
    }

    // Gắn các hàm vào window để có thể gọi từ thuộc tính 'onclick' trong HTML
    window.startTracking = startTracking;
    window.endTracking = endTracking;

    const logoutButton = document.querySelector('.btnLogin-popup');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/logout', { // Đường dẫn API đăng xuất (sẽ được định nghĩa ở backend)
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}), // Có thể không cần body, tùy thuộc vào backend
                });

                if (response.ok) {
                    // Đăng xuất thành công, chuyển hướng về trang đăng nhập
                    window.location.href = '/'; // Hoặc '/login' tùy thuộc vào route của firstpage.html
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
});