let trackingInterval;
let startTime;
let congratsShownThisSession = false;
let jsConfetti = null;
// let congratsContainer; // Khai báo ở phạm vi toàn cục

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector('.track-button');
    const endButton = document.querySelector('.end-button');
    const ipAddressInput = document.getElementById('ipAddress');
    const caloriesDisplay = document.getElementById('current-calories');
    const distanceDisplay = document.getElementById('current-distance');
    const timeDisplay = document.getElementById('current-time');
    congratsContainer = document.getElementById('congrats-container');
    const jsConfetti = new JSConfetti();
    console.log('jsConfetti instance:', jsConfetti);

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
                const responseData = await response.json();
                if (responseData.status === 'success') { // Kiểm tra trạng thái thành công từ máy chủ
                    startButton.innerHTML = '<i class="fas fa-check-circle"></i> Tracking Started';
                    startButton.style.backgroundColor = '#28a745';
                    startButton.style.color = 'white';
                    trackingInterval = setInterval(fetchTrackingData, 3000); // Bắt đầu polling dữ liệu
                } else {
                    alert(`Error starting tracking: ${responseData.message || 'Failed to start tracking.'}`);
                    resetStartButton();
                }
            } else {
                const errorData = await response.json();
                alert(`Error starting tracking: ${errorData.error || 'Something went wrong with the request.'}`);
                resetStartButton();
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            alert('Failed to connect to the server.');
            resetStartButton();
        }
    }

    async function fetchTrackingData() {
        try {
            const response = await fetch('/get_tracking_data');
            if (response.ok) {
                const data = await response.json();
                caloriesDisplay.textContent = `${parseFloat(data.calories).toFixed(2)} kcal`;
                distanceDisplay.textContent = `${parseFloat(data.distance/1000).toFixed(2)} km`;

                const currentTime = new Date();
                const elapsedTime = Math.floor((currentTime - startTime) / 1000);
                const hours = Math.floor(elapsedTime / 3600);
                const minutes = Math.floor((elapsedTime % 3600) / 60);
                const seconds = elapsedTime % 60;
                timeDisplay.textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                const currentSessionCalories = parseFloat(data.calories);
                const caloriesCurrentday = parseFloat(data.currentCalories);
                const targetCalories = parseFloat(data.targetCalories);
                const congratsShownToday = data.congratsShownToday; // Lấy trạng thái đã hiển thị trong ngày từ backend

                console.log('totalCaloriesBurned:', currentSessionCalories + caloriesCurrentday);
                console.log('targetCalories:', targetCalories);
                console.log('congratsShownToday (backend):', congratsShownToday);
                console.log('congratsShownThisSession (frontend):', congratsShownThisSession);

                if ((currentSessionCalories + caloriesCurrentday) >= targetCalories && !congratsShownToday && !congratsShownThisSession) {
                    congratsContainer.classList.add('active');
                    console.log('Giá trị của jsConfetti trước khi shoot:', jsConfetti); // Thêm dòng này
                    jsConfetti.addConfetti();
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
                console.error('Failed to fetch tracking data.');
            }
        } catch (error) {
            console.error('Error fetching tracking data:', error);
        }
    }
    
    function endTracking() {
        if (confirm('Are you sure you want to end the tracking session?')) {
         clearInterval(trackingInterval);
         resetStartButton();
         const currentCaloriesStr = caloriesDisplay.textContent;
         const caloriesBurned = parseFloat(currentCaloriesStr.replace(' kcal', ''));
      
         caloriesDisplay.textContent = '0 kcal';
         distanceDisplay.textContent = '0 km';
         timeDisplay.textContent = '0:00:00';   
         alert('Tracking session ended.');
      
         // Gửi lượng calories đã đốt lên backend
         fetch('/api/update_calories', {
          method: 'POST',
          headers: {
           'Content-Type': 'application/json',
          },
          body: JSON.stringify({ caloriesBurned: caloriesBurned }),
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
    }

    function resetStartButton() {
        startButton.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
        startButton.style.backgroundColor = '';
        startButton.style.color = '';
        startButton.disabled = false;
    }

    const logoutButton = document.querySelector('.btnLogin-popup');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                });

                if (response.ok) {
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
    // Gắn các hàm vào window để có thể gọi từ thuộc tính 'onclick' trong HTML
    window.startTracking = startTracking;
    window.endTracking = endTracking;
    // window.closeCongrats = closeCongrats;

    window.closeCongrats = () => {
        const congratsMessage = document.getElementById('congrats-container');
        congratsMessage.classList.remove('active');
        document.querySelectorAll('.confetti').forEach(c => c.remove());

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