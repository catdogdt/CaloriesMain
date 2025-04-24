const profileSection = document.getElementById('profileSection');
const updateTargetSection = document.getElementById('updateTargetSection');
const currentBurnedCaloriesSpan = document.getElementById('currentBurnedCalories');
const newCalorieTargetInput = document.getElementById('newCalorieTarget');
const totalKcalElement = document.getElementById('totalKcal');
const totalKmElement = document.getElementById('totalKm');
const totalMinElement = document.getElementById('totalMin');

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

function changePassword() {
    console.log('changePassword() called');
    const currentPasswordInput = document.querySelector('#changePasswordWrapper input[name="current_password"]');
    const newPasswordInput = document.querySelector('#changePasswordWrapper input[name="new_password"]');
    const confirmNewPasswordInput = document.querySelector('#changePasswordWrapper input[name="confirm_new_password"]');

    const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('Please fill in all password fields.');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('New passwords do not match.');
        return;
    }

    fetch('/change_password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Password updated successfully') {
            alert('Password updated successfully!');
            hideChangePasswordModal();
            // Có thể thực hiện thêm hành động sau khi đổi mật khẩu thành công
        } else {
            alert(data.error || 'Failed to update password.');
        }
    })
    .catch(error => {
        console.error('Error updating password:', error);
        alert('An error occurred while updating password.');
    });
}
// Ẩn phần cập nhật mục tiêu khi trang tải lần đầu
updateTargetSection.style.display = 'none';


document.addEventListener('DOMContentLoaded', function() {
    // Ẩn cả hai wrapper khi tải trang
    if (changePasswordWrapper) {
        changePasswordWrapper.style.transform = 'translate(-50%, -50%) scale(0)';
        changePasswordWrapper.style.visibility = 'hidden';
        changePasswordWrapper.style.opacity = '0';
    }
    if (updateTargetWrapper) {
        updateTargetWrapper.style.transform = 'translate(-50%, -50%) scale(0)';
        updateTargetWrapper.style.visibility = 'hidden';
        updateTargetWrapper.style.opacity = '0';
    }

    // Gán sự kiện click cho các nút đóng tương ứng
    if (updateTargetCloseButton) {
        updateTargetCloseButton.onclick = hideUpdateTargetModal;
    }
    if (changePasswordCloseButton) {
        changePasswordCloseButton.onclick = hideChangePasswordModal;
    }

    // Cập nhật logic click ra ngoài
    window.onclick = function(event) {
        if (event.target === changePasswordWrapper) {
            hideChangePasswordModal();
        }
        if (event.target === updateTargetWrapper) { // Target wrapper mới
            hideUpdateTargetModal();
        }
    }

    // Gán sự kiện submit cho form đổi mật khẩu
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Ngăn chặn submit form mặc định
            console.log('Form submitted'); // Thêm dòng này

            changePassword(); // Gọi hàm xử lý logic đổi mật khẩu
        });
    }

    // Logic logout giữ nguyên
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

    }
    fetchProfileData();
});

// Hàm này có thể được gọi sau khi bạn fetch dữ liệu profile từ backend
function updateProfileData(data) {
    if (totalKcalElement) {
        totalKcalElement.textContent = data.total_kcal !== null ? parseFloat(data.total_kcal).toFixed(2) : '0.00';
    }

    if (totalKmElement) {
        totalKmElement.textContent = data.total_km !== null ? parseFloat(data.total_km).toFixed(2) : '0.00';
    }

    if (totalMinElement) {
        totalMinElement.textContent = data.total_min !== null ? parseFloat(data.total_min).toFixed(2) : '0.00';
    }

    if (currentBurnedCaloriesSpan && data.goal !== null) {
        currentBurnedCaloriesSpan.textContent = parseFloat(data.goal).toFixed(0);
    }
}

// Ví dụ về cách bạn có thể fetch dữ liệu profile và gọi updateProfileData
async function fetchProfileData() {
    try {
        const response = await fetch('/api/profile'); // Thay '/api/profile' bằng endpoint thực tế của bạn
        if (response.ok) {
            const data = await response.json();
            updateProfileData(data);
        } else {
            console.error('Failed to fetch profile data.');
            // Hiển thị giá trị mặc định "0.00" nếu fetch lỗi
            updateProfileData({ total_kcal: 0.00, total_km: 0.00, total_min: 0.00, goal: 0 });
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        // Hiển thị giá trị mặc định "0.00" nếu có lỗi mạng
        updateProfileData({ total_kcal: 0.00, total_km: 0.00, total_min: 0.00, goal: 0 });
    }
}
