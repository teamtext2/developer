// Configuration
const HF_API_URL = "https://text2team-cam-api.hf.space"; 

// DOM Elements
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');
const usernameGroup = document.getElementById('username-group');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatar-input');
const previewImg = document.getElementById('preview-img');
const avatarLabel = document.getElementById('avatar-label');
const togglePwd = document.getElementById('toggle-pwd');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const loader = document.getElementById('loader');
const statusMsg = document.getElementById('status-message');
const modeToggle = document.getElementById('mode-toggle');
const modeText = document.getElementById('mode-text');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');
const avatarSection = document.getElementById('avatar-section');

let isLoginMode = false;

// Toggle Password Visibility
togglePwd.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePwd.setAttribute('data-lucide', type === 'password' ? 'eye' : 'eye-off');
    lucide.createIcons();
});

// Avatar Preview
avatarInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            avatarLabel.querySelector('i').style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
});

// Switch between Login and Signup
modeToggle.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        title.innerText = "Chào mừng trở lại";
        subtitle.innerText = "Đăng nhập để tiếp tục với text2 cam";
        btnText.innerText = "Đăng nhập";
        modeText.innerText = "Chưa có tài khoản?";
        modeToggle.innerText = "Đăng ký";
        avatarSection.style.display = 'none';
        usernameGroup.style.display = 'none';
    } else {
        title.innerText = "Tạo tài khoản";
        subtitle.innerText = "Tham gia cộng đồng text2 cam ngay hôm nay";
        btnText.innerText = "Đăng ký";
        modeText.innerText = "Đã có tài khoản?";
        modeToggle.innerText = "Đăng nhập";
        avatarSection.style.display = 'block';
        usernameGroup.style.display = 'block';
    }
    
    statusMsg.style.display = 'none';
});

// Handle Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const username = usernameInput.value;
    const avatar = avatarInput.files[0];

    // Basic Validation
    if (!isLoginMode) {
        if (!username) {
            showStatus("Vui lòng nhập tên người dùng", "error");
            return;
        }
        if (!avatar) {
            showStatus("Vui lòng chọn ảnh đại diện", "error");
            return;
        }
    }

    // UI Loading State
    setLoading(true);
    showStatus("Đang kết nối tới API...", "success");

    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        
        let endpoint = `${HF_API_URL}/api/login`;
        
        if (!isLoginMode) {
            endpoint = `${HF_API_URL}/api/register`;
            formData.append('username', username);
            formData.append('avatar', avatar);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            showStatus(isLoginMode ? "Đăng nhập thành công!" : "Đăng ký thành công!", "success");
            
            // Store user info in localStorage
            localStorage.setItem('text2cam_user', JSON.stringify(result.user));
            
            // Example: Redirect to main page after 1s
            setTimeout(() => {
                window.location.href = "../index.html"; // Go to main app
            }, 1000);
        } else {
            throw new Error(result.detail || result.message || "Có lỗi xảy ra");
        }
    } catch (error) {
        console.error("API Error:", error);
        showStatus("Lỗi: " + error.message, "error");
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.style.opacity = isLoading ? '0' : '1';
    loader.style.display = isLoading ? 'block' : 'none';
}

function showStatus(text, type) {
    statusMsg.innerText = text;
    statusMsg.className = type === 'error' ? 'msg-error' : 'msg-success';
    statusMsg.style.display = 'block';
}
