const profileSection = document.getElementById('profileSection');
const currentBurnedCaloriesSpan = document.getElementById('currentBurnedCalories');
const newCalorieTargetInput = document.getElementById('newCalorieTarget');
const totalKcalElement = document.getElementById('totalKcal');
const totalKmElement = document.getElementById('totalKm');
const totalMinElement = document.getElementById('totalMin');

const updateTargetWrapper = document.getElementById('updateTargetWrapper');
const changePasswordWrapper = document.getElementById('changePasswordWrapper'); // Sử dụng ID đã thêm
const updateTargetCloseButton = document.querySelector('#updateTargetWrapper .update-target-close');
const changePasswordCloseButton = document.querySelector('#changePasswordWrapper .change-password-close');
const changePasswordForm = document.getElementById('changePasswordForm'); // Lấy form để reset khi đóng


function showUpdateTarget() {
    // Ẩn modal đổi mật khẩu nếu nó đang hiển thị
    if (changePasswordWrapper) {
        hideChangePasswordModalInternal(); // Gọi hàm ẩn nội bộ để tránh lặp lại logic
    }
    if (updateTargetWrapper) {
        updateTargetWrapper.style.transition = 'transform .5s ease, opacity .5s ease, visibility 0s .0s';
        updateTargetWrapper.style.visibility = 'visible';
        updateTargetWrapper.style.opacity = '1';
        updateTargetWrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    }
}

function hideUpdateTargetModal() {
    if (updateTargetWrapper) {
        updateTargetWrapper.style.transition = 'transform .5s ease, opacity .5s ease, visibility 0s .5s';
        updateTargetWrapper.style.transform = 'translate(-50%, -50%) scale(0)';
        updateTargetWrapper.style.opacity = '0';
        setTimeout(() => {
            if (updateTargetWrapper.style.opacity === '0') {
                updateTargetWrapper.style.visibility = 'hidden';
            }
        }, 500);
        if (newCalorieTargetInput) {
            newCalorieTargetInput.value = '';
            const label = updateTargetWrapper.querySelector('.input-box label');
            if (label) {
                label.style.top = '50%';
            }
        }
    }
}

function showChangePasswordModal() {
    // Ẩn modal cập nhật mục tiêu nếu nó đang hiển thị
    if (updateTargetWrapper) {
        hideUpdateTargetModalInternal(); // Gọi hàm ẩn nội bộ
    }
    if (changePasswordWrapper) {
        const inputBoxes = changePasswordForm.querySelectorAll('.input-box');
        inputBoxes.forEach(box => {
            box.classList.remove('reset-label'); // Loại bỏ class reset khi hiển thị
        });
        setTimeout(() => {
            changePasswordWrapper.style.transition = 'transform .5s ease, opacity .5s ease, visibility 0s 0s';
            changePasswordWrapper.style.visibility = 'visible';
            changePasswordWrapper.style.opacity = '1';
            changePasswordWrapper.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50); // Delay 50ms
    }
}

// Hàm ẩn modal đổi mật khẩu (nội bộ để tránh gọi lẫn nhau)
function hideChangePasswordModalInternal() {
    if (changePasswordWrapper) {
        const inputs = changePasswordForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.blur();
        });
        changePasswordForm.reset();
        const labels = changePasswordForm.querySelectorAll('.input-box label');
        labels.forEach(label => { label.style.top = '50%'; });

        // Force reflow
        changePasswordWrapper.offsetHeight;

        changePasswordWrapper.style.transition = 'transform .5s ease, opacity .5s ease, visibility 0s .5s';
        changePasswordWrapper.style.transform = 'translate(-50%, -50%) scale(0)';
        changePasswordWrapper.style.opacity = '0';
        setTimeout(() => {
            if (changePasswordWrapper.style.opacity === '0') {
                changePasswordWrapper.style.visibility = 'hidden';
            }
        }, 500);
    }
}

// Hàm ẩn modal cập nhật mục tiêu (nội bộ để tránh gọi lẫn nhau)
function hideUpdateTargetModalInternal() {
    if (updateTargetWrapper) {
        updateTargetWrapper.style.transition = 'transform .5s ease, opacity .5s ease, visibility 0s .5s';
        updateTargetWrapper.style.transform = 'translate(-50%, -50%) scale(0)';
        updateTargetWrapper.style.opacity = '0';
        setTimeout(() => {
            if (updateTargetWrapper.style.opacity === '0') {
                updateTargetWrapper.style.visibility = 'hidden';
            }
        }, 500);
        if (newCalorieTargetInput) {
            newCalorieTargetInput.value = '';
            const label = updateTargetWrapper.querySelector('.input-box label');
            if (label) {
                label.style.top = '50%';
            }
        }
    }
}

function hideChangePasswordModal() {
    hideChangePasswordModalInternal();
}

// Hàm saveNewTarget giữ nguyên logic fetch nhưng gọi hideUpdateTargetModal() đúng
function saveNewTarget() {
    const newTarget = newCalorieTargetInput.value;

    if (!newTarget || isNaN(newTarget) || parseInt(newTarget) <= 0) {
        alert('Please enter a valid positive number for the target.');
        newCalorieTargetInput.focus();
        return;
    }

    fetch('/api/update_target_calories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newTarget: parseInt(newTarget) }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Target calories updated successfully') {
            alert('Target calories updated successfully!');
            if (currentBurnedCaloriesSpan) {
                 currentBurnedCaloriesSpan.textContent = newTarget;
            }
            hideUpdateTargetModal(); // Đóng modal khi thành công
        } else {
            alert(data.error || 'Failed to update target calories.');
        }
    })
    .catch(error => {
        console.error('Error updating target calories:', error);
        alert('An error occurred while updating target calories.');
    });
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
// updateTargetSection.style.display = 'none';

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
                    headers: { 'Content-Type': 'application/json', },
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

    // Optional: Thêm JS để xử lý label động cho input target mới nếu cần
    const updateTargetInputBox = document.querySelector('#updateTargetWrapper .input-box');
    if (updateTargetInputBox) {
        const input = updateTargetInputBox.querySelector('input');
        const label = updateTargetInputBox.querySelector('label');
        if (input && label) {
             input.addEventListener('focus', () => { label.style.top = '-5px'; });
             input.addEventListener('blur', () => { if (input.value === '') { label.style.top = '50%'; } });
             // Kiểm tra khi tải nếu có giá trị (dù type number thường không có)
             if (input.value !== '') { label.style.top = '-5px'; }
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
