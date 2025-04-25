document.addEventListener('DOMContentLoaded', () => {
    const dateRangeDisplay = document.querySelector('.summary .date-range');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    let currentDate = new Date();
    const percentageDisplay = document.querySelector('.completion-card .percentage');
    const progressBar = document.querySelector('.completion-card .progress-circle .progress-bar');
    const circleRadius = 66;
    const circumference = 2 * Math.PI * circleRadius;   
    const streakElement = document.getElementById('healthy-streak'); // Lấy phần tử hiển thị numberOfDays

    // Chart elements
    const generateChartButton = document.getElementById('generateChartButton');    
    const progressChartImage = document.getElementById('progressChart');
    generateChartButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/generate_progress_chart');
            console.log("Debig: Response status:", response.status);
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                progressChartImage.src = url;
                progressChartImage.style.display = 'block';
            } else {
                alert('Failed to generate chart. Please try again later.');
            }
        } catch (error) {
            console.error('Error generating progress chart:', error);
            alert('An error occurred while generating the chart.');
        }
    }); // <-- Add this closing brace and parenthesis

    function getWeekDates(date) {
        const currentDay = date.getDay();
        const diff = date.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
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
        console.log('Fetching data for week:', startDate, '-', endDate);
    }

    progressBar.style.strokeDasharray = circumference;
    progressBar.style.strokeDashoffset = circumference;

    function updateCompletionCard(caloriesCurrentday, targetCaloriesburned) {
        const completionRatio = Math.min(1, caloriesCurrentday / targetCaloriesburned);
        const percentage = Math.round(completionRatio * 100);
        percentageDisplay.textContent = `${percentage}%`;

        const offset = circumference - (completionRatio * circumference);
        progressBar.style.strokeDashoffset = offset;
    }

    // Gọi API để lấy dữ liệu tiến trình và cập nhật Completion Card
    function fetchProgressData() {
        fetch('/api/progress_data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.caloriesCurrentday !== undefined && data.targetCaloriesburned !== undefined && data.numberOfDays !== undefined) {
                    updateCompletionCard(data.caloriesCurrentday, data.targetCaloriesburned);
                    streakElement.textContent = data.numberOfDays; // Hiển thị numberOfDays
                } else {
                    console.error('Missing data in response:', data);
                    percentageDisplay.textContent = 'N/A';
                    progressBar.style.strokeDashoffset = circumference;
                    streakElement.textContent = 'N/A'; // Hiển thị N/A nếu thiếu dữ liệu
                }
            })
            .catch(error => {
                console.error('Error fetching progress data:', error);
                percentageDisplay.textContent = 'Error';
                progressBar.style.strokeDashoffset = circumference;
                streakElement.textContent = 'Error'; // Hiển thị Error nếu có lỗi
            });
    }

    // Hiển thị tuần hiện tại và tải dữ liệu tiến trình khi trang tải
    updateDateRange(currentDate);
    fetchProgressData();
    
    // prevWeekBtn.addEventListener('click', () => {
    //     currentDate.setDate(currentDate.getDate() - 7);
    //     updateDateRange(currentDate);
    //     // Có thể gọi lại fetchProgressData nếu bạn muốn hiển thị tiến trình của tuần trước/sau
    // });

    // nextWeekBtn.addEventListener('click', () => {
    //     currentDate.setDate(currentDate.getDate() + 7);
    //     updateDateRange(currentDate);
    //     // Có thể gọi lại fetchProgressData nếu bạn muốn hiển thị tiến trình của tuần trước/sau
    // });

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
                    window.location.href = '/';
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

// function updateChart(data) {
//     // Hàm này sẽ nhận dữ liệu mới và cập nhật các cột biểu đồ (nếu bạn có dữ liệu hàng tuần)
//     const bars = document.querySelectorAll('.chart .bar');
//     bars.forEach((bar, index) => {
//         const day = bar.dataset.day;
//         const dataForDay = data.find(item => item.day === day);
//         if (dataForDay) {
//             const heightPercentage = (dataForDay.calories / 1000) * 100; // Ví dụ: max calo là 1000
//             bar.style.height = `${Math.min(heightPercentage, 100)}%`;
//             const tooltip = bar.querySelector('.tooltip');
//             if (tooltip && dataForDay.details) {
//                 tooltip.innerHTML = `Calories: ${dataForDay.details.calories} Kcal<br>Date: ${formatDate(new Date(dataForDay.details.date))}`;
//             }
//         } else {
//             bar.style.height = '20%';
//             const tooltip = bar.querySelector('.tooltip');
//             if (tooltip) {
//                 tooltip.textContent = '';
//             }
//         }
//     });

//     const avgValue = document.querySelector('.summary .avg .value');
//     const totalValue = document.querySelector('.summary .total .value');
//     if (data.weeklyAvg) {
//         avgValue.textContent = data.weeklyAvg.toFixed(1);
//     }
//     if (data.weeklyTotal) {
//         totalValue.textContent = data.weeklyTotal.toFixed(1);
//     }
// }