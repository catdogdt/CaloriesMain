function showEditSection(sectionId) {
    document.querySelector('.profile-section').style.display = 'none';
    document.querySelector('.edit-profile-section').style.display = 'grid';
    window.location.hash = sectionId; // Cập nhật hash trên URL
}

function saveAndShowSection(sectionId) {
    // Logic to save data (e.g., using localStorage)
    const setGoal = document.getElementById('set-goal').value;
    const username = document.getElementById('username').value;
    // const targetCalories = document.getElementById('target-calories').value; // Đánh dấu bỏ


    // localStorage.setItem('profileSetGoal', setGoal);
    localStorage.setItem('profileUsername', username);
    // localStorage.setItem('profileTargetCalories', targetCalories); // Đánh dấu bỏ

    updateProfileView();
    document.querySelector('.profile-section').style.display = 'flex';
    document.querySelector('.edit-profile-section').style.display = 'none';
    window.location.hash = sectionId; // Cập nhật hash trên URL
}

function updateProfileView() {
    // const setGoalViewInput = document.querySelector('#profile-view #set-goal-view');
    const profileNameDiv = document.querySelector('#profile-view .profile-name');
    // const targetCaloriesViewInput = document.querySelector('#profile-view #target-calories-view'); // Đánh dấu bỏ

    const savedSetGoal = localStorage.getItem('profileSetGoal');
    const savedUsername = localStorage.getItem('profileUsername');
    // const savedTargetCalories = localStorage.getItem('profileTargetCalories'); // Đánh dấu bỏ

    if (savedSetGoal) setGoalViewInput.value = savedSetGoal;
    if (savedUsername) profileNameDiv.textContent = savedUsername;
    // if (savedTargetCalories) targetCaloriesViewInput.value = savedTargetCalories; // Đánh dấu bỏ
}

// Hiển thị phần edit nếu có hash #edit-profile trong URL khi tải trang
window.onload = function() {
    if (window.location.hash === '#edit-profile') {
        document.querySelector('.profile-section').style.display = 'none';
        document.querySelector('.edit-profile-section').style.display = 'grid';
    } else {
        document.querySelector('.edit-profile-section').style.display = 'none';
        document.querySelector('.profile-section').style.display = 'flex';
    }
    updateProfileView();
};

function updateProfileView() {
    const setGoalViewInput = document.querySelector('#profile-view #set-goal-view');

    // const targetCaloriesViewInput = document.querySelector('#profile-view #target-calories-view'); // Đánh dấu bỏ

    // Lấy dữ liệu từ biến 'user' được truyền từ Flask
    const savedSetGoal = "{{ user.goal }}";
    // const savedTargetCalories = "{{ user.calories }}"; // Đánh dấu bỏ

    if (savedSetGoal) setGoalViewInput.value = savedSetGoal;
    if (savedUsername) profileNameDiv.textContent = savedUsername;
    // if (savedTargetCalories) targetCaloriesViewInput.value = savedTargetCalories; // Đánh dấu bỏ
}

window.onload = function() {
    if (window.location.hash === '#edit-profile') {
        document.querySelector('.profile-section').style.display = 'none';
        document.querySelector('.edit-profile-section').style.display = 'grid';
    } else {
        document.querySelector('.edit-profile-section').style.display = 'none';
        document.querySelector('.profile-section').style.display = 'flex';
    }
    updateProfileView();
};