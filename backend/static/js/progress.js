document.addEventListener('DOMContentLoaded', () => {
    const dateRangeDisplay = document.querySelector('.summary .date-range');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    let currentDate = new Date();

    function getWeekDates(date) {
        const currentDay = date.getDay(); // 0 for Sunday, 1 for Monday, ...
        const diff = date.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust when day is Sunday
        const startOfWeek = new Date(date.setDate(diff));
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const nextDay = new Date(startOfWeek);
            nextDay.setDate(startOfWeek.getDate() + i);
            weekDates.push(nextDay);
        }
        return weekDates;
    }

    function formatDate(date) {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function updateDateRange(date) {
        const weekDates = getWeekDates(new Date(date));
        const startDate = formatDate(weekDates[0]);
        const endDate = formatDate(weekDates[6]);
        dateRangeDisplay.textContent = `${startDate} - ${endDate}`;
        // Ở đây bạn sẽ gọi API để lấy dữ liệu cho tuần này và cập nhật biểu đồ
        // Ví dụ: fetch(`/api/progress?start=${weekDates[0].toISOString()}&end=${weekDates[6].toISOString()}`)
        console.log('Fetching data for week:', startDate, '-', endDate);
        // Placeholder cho việc cập nhật biểu đồ với dữ liệu mới
        // updateChart(dataForWeek);
    }

    // Hiển thị tuần hiện tại khi trang tải
    updateDateRange(currentDate);

    prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        updateDateRange(currentDate);
    });

    nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        updateDateRange(currentDate);
    });

    
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


function updateChart(data) {
    // Hàm này sẽ nhận dữ liệu mới và cập nhật các cột biểu đồ
    // Dựa vào cấu trúc dữ liệu bạn nhận được từ backend
    const bars = document.querySelectorAll('.chart .bar');
    bars.forEach((bar, index) => {
        const day = bar.dataset.day;
        const dataForDay = data.find(item => item.day === day);
        if (dataForDay) {
            const heightPercentage = (dataForDay.calories / 1000) * 100; // Ví dụ: max calo là 1000
            bar.style.height = `${Math.min(heightPercentage, 100)}%`;
            // Cập nhật tooltip nếu có dữ liệu chi tiết
            const tooltip = bar.querySelector('.tooltip');
            if (tooltip && dataForDay.details) {
                tooltip.innerHTML = `Calories: ${dataForDay.details.calories} Kcal<br>Date: ${formatDate(new Date(dataForDay.details.date))}`;
            }
        } else {
            bar.style.height = '20%'; // Giá trị mặc định nếu không có dữ liệu
            const tooltip = bar.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = '';
            }
        }
    });

    // Cập nhật giá trị trung bình và tổng nếu có
    const avgValue = document.querySelector('.summary .avg .value');
    const totalValue = document.querySelector('.summary .total .value');
    if (data.weeklyAvg) {
        avgValue.textContent = data.weeklyAvg.toFixed(1);
    }
    if (data.weeklyTotal) {
        totalValue.textContent = data.weeklyTotal.toFixed(1);
    }
}