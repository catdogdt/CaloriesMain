const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const iconClose = document.querySelector('.icon-close');
const getStartedButton = document.getElementById('showLoginPopup');
const loginForm = document.querySelector('.form-box.login form');
const registerForm = document.querySelector('.form-box.register form');
const forgotPasswordForm = document.querySelector('.form-box.forgot-password form'); // Dòng có thể gây lỗi
const forgotPasswordLoginLink = document.querySelector('.form-box.forgot-password .login-register p a');

registerLink.addEventListener('click', () => {
    wrapper.classList.add('active');
    wrapper.classList.remove('active-forgot-password'); // Đảm bảo forgot password bị ẩn
});

loginLink.addEventListener('click', () => {
    wrapper.classList.remove('active');
    wrapper.classList.remove('active-forgot-password'); // Đảm bảo forgot password bị ẩn
});

iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
    wrapper.classList.remove('active');
    wrapper.classList.remove('active-forgot-password'); // Đảm bảo tất cả form đều ẩn
});

getStartedButton.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
    wrapper.classList.remove('active');
    wrapper.classList.remove('active-forgot-password'); // Đảm bảo chỉ popup hiện
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = loginForm.querySelector('input[type="mail"]');
    const passwordInput = loginForm.querySelector('input[type="password"]');
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful:', data);
            localStorage.setItem('userEmail', email); // Lưu email vào localStorage
            window.location.href = '/tracking';
        } else {
            alert(`Login failed: ${data.error || 'Invalid credentials'}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login.');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = registerForm.querySelector('.input-box:nth-child(1) input[type="mail"]');
    const passwordInput = registerForm.querySelector('.input-box:nth-child(2) input[type="password"]');
    const targetCaloriesInput = registerForm.querySelector('.input-box:nth-child(3) input[type="text"]');

    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    const target_calories = targetCaloriesInput ? targetCaloriesInput.value : ''; // Lấy giá trị target calories

    if (!email || !password || !target_calories) { // Kiểm tra target_calories
        alert('Please enter email, password, and target calories.');
        return;
    }

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                targetCaloriesburned: target_calories, // ĐÃ SỬA TÊN BIẾN
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration successful:', data);
            alert('Registration successful! Please log in.');
            wrapper.classList.remove('active');
        } else {
            alert(`Registration failed: ${data.error || 'Something went wrong'}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration.');
    }
});

// Xử lý submit form "Forgot Password" (bạn cần triển khai logic này ở backend)
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = forgotPasswordForm.querySelector('input[type="mail"]');
    const otpInput = forgotPasswordForm.querySelector('input[type="text"]');
    const newPasswordInput = forgotPasswordForm.querySelector('input[type="password"]');
    const email = emailInput.value;
    const otp = otpInput.value;
    const newPassword = newPasswordInput.value;

    // Gửi yêu cầu đặt lại mật khẩu đến backend
    try {
        const response = await fetch('/auth/reset-password', { // Định nghĩa route này ở backend
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp, new_password: newPassword }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Password reset successful! Please log in with your new password.');
            wrapper.classList.remove('active-popup');
            wrapper.classList.remove('active-forgot-password');
        } else {
            alert(`Password reset failed: ${data.error || 'Invalid information'}`);
        }
    } catch (error) {
        console.error('Password reset error:', error);
        alert('An error occurred during password reset.');
    }
});

forgotPasswordLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    wrapper.classList.add('active-popup'); // Hiển thị lại popup
    wrapper.classList.remove('active-forgot-password'); // Ẩn form "Forgot Password"
    wrapper.classList.remove('active'); // Đảm bảo form "Register" không hiển thị
});