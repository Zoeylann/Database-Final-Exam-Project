const menuData = [
    { id: 1, name: '美式咖啡', price: 45, desc: '阿拉比卡 香醇最佳選擇', type: 'coffee' },
    { id: 2, name: '拿鐵咖啡', price: 65, desc: '奶香濃郁 完美融合', type: 'latte' },
    { id: 3, name: '卡布奇諾', price: 60, desc: '綿密奶泡 經典比例', type: 'latte' },
    { id: 4, name: '抹茶拿鐵', price: 70, desc: '日式風味 順口好喝', type: 'matcha' },
    { id: 5, name: '起司蛋糕', price: 80, desc: '入口即化的口感', type: 'dessert' },
    { id: 6, name: '巧克力餅乾', price: 35, desc: '手工現烤 濃郁巧克力', type: 'dessert' }
];

let myCart = [];
let currentSelectedProduct = null;
let currentModalQty = 1;

let authMode = 'login'; 
let currentUser = null;

const STORAGE_KEY = 'coffee_orders_team130';
const MEMBER_KEY = 'coffee_members_team130';
const SESSION_KEY = 'current_login_user_team130';

function toggleModal(modalId, show) {
    const targetModal = document.getElementById(modalId);
    if (targetModal) {
        targetModal.style.display = show ? 'flex' : 'none';
    }
}

// ==========================================
// 會員認證模組（含頂部小字動態渲染）
// ==========================================
function checkLoginSession() {
    const savedUser = localStorage.getItem(SESSION_KEY);
    const badge = document.getElementById('login-small-badge');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loginSuccess(currentUser);
    } else {
        // 未登入時，確保灰色小字正常顯示
        if (badge) {
            badge.innerHTML = `會員登入`;
            badge.style.display = "inline-block"; // 顯示小字
            badge.style.color = "#7f8c8d";
            badge.style.textDecoration = "underline";
            badge.style.cursor = "pointer";
        }
        toggleModal('auth-modal', true);
    }
}

function switchAuthMode() {
    const title = document.getElementById('auth-title');
    const primaryBtn = document.getElementById('btn-auth-primary');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    
    if (authMode === 'login') {
        authMode = 'register';
        title.innerText = '註冊新會員';
        primaryBtn.innerText = '註冊並登入';
        switchText.innerText = '已經是會員？';
        switchLink.innerText = '切換至登入';
    } else {
        authMode = 'login';
        title.innerText = '會員登入';
        primaryBtn.innerText = '登入';
        switchText.innerText = '首次點餐？';
        switchLink.innerText = '註冊新會員';
    }
}

function handleAuthSubmit() {
    const phone = document.getElementById('auth-phone').value.trim();
    const name = document.getElementById('auth-name').value.trim();

    if (!phone) { alert('請輸入手機號碼！'); return; }

    let members = JSON.parse(localStorage.getItem(MEMBER_KEY) || '[]');

    if (authMode === 'register') {
        if (!name) { alert('請填寫姓名以完成註冊！'); return; }
        if (members.some(m => m.phone === phone)) {
            alert('此電話已被註冊，已為您自動切換至登入模式。');
            authMode = 'register'; switchAuthMode(); return;
        }
        const newMember = { phone, name };
        members.push(newMember);
        localStorage.setItem(MEMBER_KEY, JSON.stringify(members));
        currentUser = newMember;
    } else {
        const user = members.find(m => m.phone === phone);
        if (!user) { alert('找不到此會員檔案，請切換至註冊！'); return; }
        currentUser = user;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    loginSuccess(currentUser);
}

function handleSmallBadgeClick() {
    if (!currentUser) {
        toggleModal('auth-modal', true);
    }
}

function loginSuccess(user) {
    toggleModal('auth-modal', false);
    document.getElementById('current-user-badge').style.display = 'block';
    document.getElementById('user-display-name').innerText = user.name;
    document.getElementById('cust-name').value = user.name;
    document.getElementById('cust-phone').value = user.phone;
    
    // ✨ 核心修改：登入成功後，直接讓這行小字徹底消失
    const badge = document.getElementById('login-small-badge');
    if (badge) {
        badge.style.display = "none"; 
    }
    renderCart();
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    document.getElementById('current-user-badge').style.display = 'none';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('auth-phone').value = '';
    document.getElementById('auth-name').value = '';
    
    // ✨ 同步恢復：登出之後，重新把可點擊的灰色 [會員登入] 小字喚醒顯示
    const badge = document.getElementById('login-small-badge');
    if (badge) {
        badge.innerHTML = `會員登入`;
        badge.style.display = "inline-block"; // 重新顯示
        badge.style.color = "#7f8c8d";
        badge.style.textDecoration = "underline";
        badge.style.cursor = "pointer";
    }
    toggleModal('auth-modal', true);
}

// ==========================================
// 點餐與客製化核心（含智慧甜度/冰塊連動邏輯）
// ==========================================
function initMenu() {
    const area = document.getElementById('menu-area');
    area.innerHTML = menuData.map(item => `
        <div class="product-card">
            <h3>${item.name}</h3>
            <p style="color: #666; font-size: 0.85rem; min-height: 40px;">${item.desc}</p>
            <p class="price">NT$ ${item.price}</p>
            <button onclick="handleAddToCartClick(${item.id})">加入購物車</button>
        </div>
    `).join('');
}

function handleAddToCartClick(id) {
    const item = menuData.find(p => p.id === id);
    if (item.type === 'dessert') {
        addDessertToCart(item);
    } else {
        openCustomModal(item);
    }
}

function addDessertToCart(product) {
    const existingIndex = myCart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        myCart[existingIndex].quantity += 1;
    } else {
        myCart.push({
            ...product,
            quantity: 1,
            customString: '固定規格',
            cartId: Date.now() + Math.random()
        });
    }
    renderCart();
}

// 開啟規格客製化彈窗
function openCustomModal(item) {
    currentSelectedProduct = item;
    currentModalQty = 1;
    document.getElementById('modal-qty-display').innerText = currentModalQty;
    document.getElementById('custom-product-name').innerText = `${item.name} - 客製化規格調整`;
    
    // 預設將選單重設為「熱」，隱藏冰塊選擇
    document.getElementById('modal-temp-select').value = "熱";
    document.getElementById('ice-group').style.display = "none";

    // 甜度調整核心判定：拿鐵咖啡、卡布奇諾、抹茶拿鐵才開啟甜度
    const isMilky = ['拿鐵咖啡', '卡布奇諾', '抹茶拿鐵'].includes(item.name);
    document.getElementById('sweet-group').style.display = isMilky ? 'block' : 'none';
    
    // 原物料進階加價判定
    if (item.type === 'coffee') {
        document.getElementById('espresso-group').style.display = 'block';
        document.getElementById('milk-group').style.display = 'none';
    } else if (item.type === 'matcha') {
        document.getElementById('espresso-group').style.display = 'none';
        document.getElementById('milk-group').style.display = 'block';
    } else {
        document.getElementById('espresso-group').style.display = 'block';
        document.getElementById('milk-group').style.display = 'block';
    }
    toggleModal('custom-modal', true);
}

// 智慧動態連動：當選擇「冰」才顯示冰塊調整；選「熱」自動隱藏
function onModalTempChange() {
    const tempValue = document.getElementById('modal-temp-select').value;
    const iceGroup = document.getElementById('ice-group');
    if (tempValue === "冰") {
        iceGroup.style.display = "block";
    } else {
        iceGroup.style.display = "none";
    }
}

function changeModalQty(amount) {
    currentModalQty += amount;
    if (currentModalQty < 1) currentModalQty = 1;
    document.getElementById('modal-qty-display').innerText = currentModalQty;
}

function closeCustomModal() {
    toggleModal('custom-modal', false);
    currentSelectedProduct = null;
}

// 組合客製化規格並寫入購物車
function confirmAddToCart() {
    if (!currentSelectedProduct) return;

    const temp = document.getElementById('modal-temp-select').value;
    let customDetails = [];

    // 1. 處理冰塊與溫度字串
    if (temp === "冰") {
        const ice = document.getElementById('modal-ice-select').value;
        customDetails.push(`${temp}(${ice})`);
    } else {
        customDetails.push(temp);
    }

    // 2. 處理甜度字串 (只有特定品項需要加入)
    const isMilky = ['拿鐵咖啡', '卡布奇諾', '抹茶拿鐵'].includes(currentSelectedProduct.name);
    if (isMilky) {
        const sweet = document.getElementById('modal-sweet-select').value;
        customDetails.push(sweet);
    }

    // 3. 處理原有咖啡特濃與牛奶調整
    let espresso = "標準";
    if (currentSelectedProduct.type !== 'matcha') {
        espresso = document.querySelector('input[name="espresso-option"]:checked').value;
    }
    let milk = "全脂鮮乳";
    if (currentSelectedProduct.type !== 'coffee') {
        milk = document.querySelector('input[name="milk-option"]:checked').value;
    }

    let singlePrice = currentSelectedProduct.price;
    if (espresso === "特濃") { singlePrice += 15; customDetails.push("特濃"); }
    if (currentSelectedProduct.type !== 'coffee' && milk === "燕麥奶") { singlePrice += 20; customDetails.push("燕麥奶"); }

    const customKey = customDetails.join(' / ');
    const existingIndex = myCart.findIndex(item => item.id === currentSelectedProduct.id && item.customString === customKey);

    if (existingIndex > -1) {
        myCart[existingIndex].quantity += currentModalQty;
    } else {
        myCart.push({
            ...currentSelectedProduct,
            price: singlePrice,
            customString: customKey,
            quantity: currentModalQty,
            cartId: Date.now() + Math.random()
        });
    }

    closeCustomModal();
    renderCart();
}

function changeCartQty(cartId, amount) {
    const index = myCart.findIndex(item => item.cartId === cartId);
    if (index === -1) return;

    myCart[index].quantity += amount;
    if (myCart[index].quantity <= 0) {
        myCart = myCart.filter(item => item.cartId !== cartId);
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    const totalDisplay = document.getElementById('total-price');
    const btn = document.getElementById('btn-submit');

    list.innerHTML = myCart.map(i => `
        <div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
            <div>
                <div style="font-weight:bold;">${i.name}</div>
                <small style="color:#888;">(${i.customString})</small>
                <div style="color:#e76f51; font-size:0.85rem; margin-top:2px;">單價: NT$ ${i.price}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="changeCartQty(${i.cartId}, -1)" class="btn-qty-cart">-</button>
                <span style="font-weight:bold; min-width:15px; text-align:center;">${i.quantity}</span>
                <button onclick="changeCartQty(${i.cartId}, 1)" class="btn-qty-cart">+</button>
            </div>
        </div>
    `).join('');

    const total = myCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    totalDisplay.innerText = `NT$ ${total}`;
    btn.disabled = (myCart.length === 0 || !currentUser);
}

// ==========================================
// 訂單建立與即時動態更新
// ==========================================
function sendOrder() {
    if (!currentUser) { alert('請先登入會員再提交訂單！'); return; }

    const orderNum = Math.floor(Math.random() * 900) + 100;
    const orderData = {
        id: orderNum,
        name: currentUser.name,
        phone: currentUser.phone,
        items: [...myCart],
        total: myCart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        time: new Date().toLocaleTimeString(),
        status: '待處理' 
    };

    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    orders.push(orderData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

    localStorage.setItem('my_last_order_id', orderNum);
    document.getElementById('order-id').innerText = `#${orderNum}`;
    toggleModal('order-modal', true);
}

function openOrderStatusModal() {
    const lastOrderId = localStorage.getItem('my_last_order_id');
    const container = document.getElementById('tracker-container');
    
    if (!lastOrderId) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding: 20px 0;">您目前在此裝置尚無進行中的訂單紀錄。</p>';
        toggleModal('status-tracker-modal', true);
        return;
    }

    const activeOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const matchedOrder = activeOrders.find(o => o.id == lastOrderId);

    if (!matchedOrder) {
        container.innerHTML = `
            <div style="text-align:center; padding:10px;">
                <h4 style="color:#27ae60; margin:0 0 5px 0;">🎉 訂單號碼 #${lastOrderId}</h4>
                <div style="background:#e8f8f5; color:#27ae60; padding:10px; border-radius:6px; font-weight:bold; display:inline-block; margin-bottom:10px;">餐點已完成 / 已取餐</div>
                <p style="font-size:0.85rem; color:#666; margin:0;">感謝您的光臨，請至櫃檯領取您香醇的咖啡！</p>
            </div>`;
    } else {
        let currentStatus = matchedOrder.status || '待處理';
        let step1Class = "step-active", step2Class = "", step3Class = "";
        
        if (currentStatus === "製作中") {
            step2Class = "step-active";
        } else if (currentStatus === "請取餐") {
            step2Class = "step-active";
            step3Class = "step-active";
        }

        container.innerHTML = `
            <div style="background:#fdfbf7; border:1px solid #f3ebe1; padding:15px; border-radius:8px;">
                <p style="margin:0 0 10px 0;"><strong>當前追蹤單號：</strong> <span style="color:#e76f51; font-weight:bold;">#${matchedOrder.id}</span></p>
                <p style="margin:0 0 15px 0;"><strong>下單時間：</strong> ${matchedOrder.time}</p>
                
                <div class="tracker-steps">
                    <div class="step ${step1Class}"><div>1</div>待處理</div>
                    <div class="step ${step2Class}"><div>2</div>製作中</div>
                    <div class="step ${step3Class}"><div>3</div>請取餐</div>
                </div>
                <p style="text-align:center; font-size:0.85rem; color:#888; margin:15px 0 0 0;">(提示：此頁面隨後台變更同步重新計算更新)</p>
            </div>`;
    }
    toggleModal('status-tracker-modal', true);
}

function closeModal() {
    toggleModal('order-modal', false);
    myCart = [];
    renderCart();
}

// ==========================================
// 系統高頻動態更新初始化區
// ==========================================
initMenu();
checkLoginSession();

// 每 1 秒動態巡檢：若進度彈窗正開啟，立刻重抓後台資料進行高畫質步驟更新
setInterval(() => {
    const trackerModal = document.getElementById('status-tracker-modal');
    if (trackerModal && trackerModal.style.display === 'flex') {
        openOrderStatusModal();
    }
}, 1000);
