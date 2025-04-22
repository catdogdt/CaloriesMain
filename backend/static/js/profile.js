const profileSection = document.getElementById('profileSection');
const updateTargetSection = document.getElementById('updateTargetSection');
const currentBurnedCaloriesSpan = document.getElementById('currentBurnedCalories');
const newCalorieTargetInput = document.getElementById('newCalorieTarget');

function showUpdateTarget() {
    profileSection.style.display = 'none';
    updateTargetSection.style.display = 'flex';
}

function hideUpdateTarget() {
    profileSection.style.display = 'flex';
    updateTargetSection.style.display = 'none';
}

function saveNewTarget() {
    const newTarget = newCalorieTargetInput.value;
    // Ở đây bạn sẽ thêm logic để thực sự lưu giá trị mới này
    // Ví dụ: gửi đến máy chủ hoặc lưu vào local storage
    // Cập nhật giá trị hiển thị (ví dụ)
    // currentBurnedCaloriesSpan.textContent = newTarget;
    hideUpdateTarget(); // Quay lại trang hồ sơ sau khi lưu
    alert(`New target saved: ${newTarget} kcal`); // Hiển thị thông báo (chỉ cho mục đích demo)
}

// Ẩn phần cập nhật mục tiêu khi trang tải lần đầu
updateTargetSection.style.display = 'none';

document.addEventListener('DOMContentLoaded', () => {
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
});