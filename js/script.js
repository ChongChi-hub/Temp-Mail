const API_URL = 'https://api.mail.tm';
let token = '';
let currentEmail = '';
let currentPassword = '';

// Thời gian đếm ngược (10 phút)
let timeLeft = 600; 

// --- CÁC HÀM XỬ LÝ GIAO DIỆN ---

// Chuyển đổi trạng thái hiển thị (Loading / Empty / List)
function setInboxState(state) {
    const loadingEl = document.getElementById('state-loading');
    const emptyEl = document.getElementById('state-empty');
    const listEl = document.getElementById('mail-list');

    // Ẩn tất cả trước
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'none';
    listEl.style.display = 'none';

    if (state === 'loading') {
        loadingEl.style.display = 'flex';
    } else if (state === 'empty') {
        emptyEl.style.display = 'flex';
    } else if (state === 'has-data') {
        listEl.style.display = 'block';
    }
}

// Cập nhật đồng hồ đếm ngược
function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    if (timeLeft > 0) timeLeft--;
    else {
        // Hết giờ thì tự tạo mail mới
        createNewEmail();
    }
}

// --- LOGIC API ---

// 1. Tạo Email Mới
async function createNewEmail() {
    // Reset giao diện
    document.getElementById('email-address').value = "Đang tạo...";
    setInboxState('loading');
    timeLeft = 600; // Reset về 10p

    try {
        // Lấy domain
        const domainRes = await fetch(`${API_URL}/domains`);
        const domains = await domainRes.json();
        const domain = domains['hydra:member'][0].domain;

        // Random user
        const user = Math.random().toString(36).substring(7);
        currentPassword = Math.random().toString(36).substring(7);
        currentEmail = `${user}@${domain}`;

        // Đăng ký
        await fetch(`${API_URL}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: currentEmail, password: currentPassword })
        });

        // Lấy Token
        const tokenRes = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: currentEmail, password: currentPassword })
        });
        const tokenData = await tokenRes.json();
        token = tokenData.token;

        // Hiển thị email lên ô input
        document.getElementById('email-address').value = currentEmail;
        
        // Check mail ngay lập tức
        checkMail();

    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối server, vui lòng thử lại!");
    }
}

// 2. Kiểm tra Inbox
async function checkMail() {
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const messages = data['hydra:member'] || [];

        const listEl = document.getElementById('mail-list');

        if (messages.length === 0) {
            setInboxState('empty');
        } else {
            setInboxState('has-data');
            // Render danh sách (Tránh render lại nếu không có gì mới để đỡ giật)
            if (listEl.children.length !== messages.length) {
                renderList(messages);
            }
        }
    } catch (e) {
        console.error("Lỗi check mail:", e);
    }
}

// 3. Vẽ danh sách ra màn hình
function renderList(messages) {
    const listEl = document.getElementById('mail-list');
    listEl.innerHTML = ''; // Xóa cũ

    messages.forEach(msg => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="mail-from">${msg.from.address} <span class="mail-time">${new Date(msg.createdAt).toLocaleTimeString()}</span></div>
            <div class="mail-subject">${msg.subject}</div>
        `;
        li.onclick = () => readMail(msg.id);
        listEl.appendChild(li);
    });
}

// 4. Đọc nội dung chi tiết
async function readMail(id) {
    try {
        const res = await fetch(`${API_URL}/messages/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        // Hiện popup nội dung (đơn giản dùng alert, bạn có thể làm modal xịn hơn)
        alert(`Nội dung:\n\n${data.text || "Email HTML"}`);
    } catch (e) { alert("Lỗi đọc thư"); }
}

// 5. Nút Copy
function copyToClipboard() {
    navigator.clipboard.writeText(currentEmail);
    // Hiệu ứng nháy nút copy
    const btn = document.querySelector('.btn-icon');
    btn.style.color = '#2ecc71';
    setTimeout(() => btn.style.color = '', 500);
}

// 6. Nút Gia hạn (Reset đồng hồ)
function resetTimer() {
    timeLeft = 600;
    updateTimer();
}

// 7. Nút Làm mới (Thủ công)
function manualRefresh() {
    setInboxState('loading'); // Hiện loading xoay xoay như ảnh
    setTimeout(() => {
        checkMail(); // Sau 500ms thì check thật (để người dùng thấy hiệu ứng loading)
    }, 500);
}

// --- KHỞI CHẠY ---
createNewEmail(); // Tạo mail ngay khi vào web

// Đồng hồ đếm ngược (mỗi 1s)
setInterval(updateTimer, 1000);

// Tự động check mail (mỗi 2s như yêu cầu)
setInterval(checkMail, 2000);