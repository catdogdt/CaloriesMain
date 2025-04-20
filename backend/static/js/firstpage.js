const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const iconClose = document.querySelector('.icon-close');
const getStartedButton = document.getElementById('showLoginPopup');
const loginForm = document.querySelector('.form-box.login form');
const registerForm = document.querySelector('.form-box.register form');

registerLink.addEventListener('click', () => {
    wrapper.classList.add('active');
});

loginLink.addEventListener('click', () => {
    wrapper.classList.remove('active');
});

iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
});

getStartedButton.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
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
    // const targetCaloriesInput = registerForm.querySelector('.input-box:nth-child(3) input[type="text"]'); // Sửa thành text vì type="text" trong HTML

    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    // const target_calories = targetCaloriesInput ? targetCaloriesInput.value : '';

    if (!email || !password) {
        alert('Please enter email and password.');
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
                // target_calories: target_calories,
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