// ==========================================
// 頂部常數與資料宣告
// ==========================================
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
let currentDiscountRedeemed = 0; // 顧客選擇折抵的實體元數
let currentCaptcha = '';         // ✨ 修正：補上驗證碼全域變數

// 🔑 核心修正：補齊後台管理與大數據所使用的所有對應 LocalStorage Key
const STORAGE_KEY = 'coffee_orders_team130';
const HISTORY_KEY = 'coffee_history_team130'; // ✨ 修正：原本漏了這一行，導致點數計算直接報錯鎖死！
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
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptcha = code;
    const box = document.getElementById('captcha-code-box');
    if (box) box.innerText = code;
}

function checkLoginSession() {
    const savedUser = localStorage.getItem(SESSION_KEY);
    const badge = document.getElementById('login-small-badge');
    
    generateCaptcha();

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loginSuccess(currentUser);
    } else {
        if (badge) {
            badge.innerHTML = `會員登入`;
            badge.style.display = "inline-block";
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
    const nameGroup = document.getElementById('auth-name-group');
    
    document.getElementById('auth-captcha-input').value = '';
    generateCaptcha();

    if (authMode === 'login') {
        authMode = 'register';
        title.innerText = '註冊新會員';
        primaryBtn.innerText = '註冊並登入';
        switchText.innerText = '已經是會員？';
        switchLink.innerText = '切換至登入';
        if (nameGroup) nameGroup.style.display = 'block';
    } else {
        authMode = 'login';
        title.innerText = '會員登入';
        primaryBtn.innerText = '登入';
        switchText.innerText = '首次點餐？';
        switchLink.innerText = '註冊新會員';
        if (nameGroup) nameGroup.style.display = 'none';
    }
}

function handleAuthSubmit() {
    const phone = document.getElementById('auth-phone').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const name = document.getElementById('auth-name').value.trim();
    const captchaInput = document.getElementById('auth-captcha-input').value.trim().toUpperCase();

    if (!phone) { alert('請輸入手機號碼！'); return; }
    if (!password) { alert('請輸入密碼！'); return; }
    
    if (captchaInput !== currentCaptcha) {
        alert('驗證碼輸入錯誤，請重新輸入！');
        generateCaptcha();
        document.getElementById('auth-captcha-input').value = '';
        return;
    }

    let members = JSON.parse(localStorage.getItem(MEMBER_KEY) || '[]');

    if (authMode === 'register') {
        if (!name) { alert('請填寫姓名以完成註冊！'); return; }
        if (members.some(m => m.phone === phone)) {
            alert('此電話已被註冊，已為您切換至登入模式。');
            authMode = 'login'; 
            switchAuthMode(); 
            return;
        }
        const newMember = { phone, name, password };
        members.push(newMember);
        localStorage.setItem(MEMBER_KEY, JSON.stringify(members));
        currentUser = { phone, name }; 
    } else {
        const user = members.find(m => m.phone === phone);
        if (!user) { alert('找不到此會員檔案，請確認電話是否正確，或切換至註冊！'); return; }
        if (user.password !== password) { alert('密碼錯誤，請重新輸入！'); generateCaptcha(); return; }
        currentUser = { phone: user.phone, name: user.name };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    loginSuccess(currentUser);
}

function handleSmallBadgeClick() {
    if (!currentUser) {
        toggleModal('auth-modal', true);
        generateCaptcha();
    }
}

function loginSuccess(user) {
    toggleModal('auth-modal', false);
    document.getElementById('current-user-badge').style.display = 'block';
    document.getElementById('user-display-name').innerText = user.name;
    document.getElementById('cust-name').value = user.name;
    document.getElementById('cust-phone').value = user.phone;
    
    const badge = document.getElementById('login-small-badge');
    if (badge) badge.style.display = "none"; 
    
    renderCart();
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    document.getElementById('current-user-badge').style.display = 'none';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('auth-phone').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-name').value = '';
    document.getElementById('auth-captcha-input').value = '';
    
    const badge = document.getElementById('login-small-badge');
    if (badge) {
        badge.innerHTML = `會員登入`;
        badge.style.display = "inline-block";
        badge.style.color = "#7f8c8d";
        badge.style.textDecoration = "underline";
        badge.style.cursor = "pointer";
    }
    toggleModal('auth-modal', true);
    generateCaptcha();
}

// ==========================================
// 點餐與客製化核心
// ==========================================
function initMenu() {
    const area = document.getElementById('menu-area');
    if (!area) return;
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

function openCustomModal(item) {
    currentSelectedProduct = item;
    currentModalQty = 1;
    document.getElementById('modal-qty-display').innerText = currentModalQty;
    document.getElementById('custom-product-name').innerText = `${item.name} - 客製化規格調整`;
    
    document.getElementById('modal-temp-select').value = "熱";
    document.getElementById('ice-group').style.display = "none";

    const isMilky = ['拿鐵咖啡', '卡布奇諾', '抹茶拿鐵'].includes(item.name);
    document.getElementById('sweet-group').style.display = isMilky ? 'block' : 'none';
    
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

function confirmAddToCart() {
    if (!currentSelectedProduct) return;

    const temp = document.getElementById('modal-temp-select').value;
    let customDetails = [];

    if (temp === "冰") {
        const ice = document.getElementById('modal-ice-select').value;
        customDetails.push(`${temp}(${ice})`);
    } else {
        customDetails.push(temp);
    }

    const isMilky = ['拿鐵咖啡', '卡布奇諾', '抹茶拿鐵'].includes(currentSelectedProduct.name);
    if (isMilky) {
        const sweet = document.getElementById('modal-sweet-select').value;
        customDetails.push(sweet);
    }

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

// ==========================================
// 💰 會員累積點數即時折抵功能 (防呆安全版)
// ==========================================
// 計算目前登入會員擁有的總點數 (雙軌即時同步版)
function calculateCurrentUserPoints() {
    if (!currentUser) return 0;
    
    // 1. 撈取「已結案」的歷史紀錄 (HISTORY_KEY)
    const historyData = localStorage.getItem(HISTORY_KEY);
    let history = [];
    try {
        history = historyData ? JSON.parse(historyData) : [];
        if (!Array.isArray(history)) history = [];
    } catch(e) {
        history = [];
    }
    
    // 2. 撈取「進行中 / 待處理 / 製作中」的即時訂單 (STORAGE_KEY)
    const activeData = localStorage.getItem(STORAGE_KEY);
    let activeOrders = [];
    try {
        activeOrders = activeData ? JSON.parse(activeData) : [];
        if (!Array.isArray(activeOrders)) activeOrders = [];
    } catch(e) {
        activeOrders = [];
    }
    
    // 3. 過濾出屬於目前登入會員的資料
    const myHistory = history.filter(o => String(o.phone).trim() === String(currentUser.phone).trim());
    const myActive = activeOrders.filter(o => String(o.phone).trim() === String(currentUser.phone).trim());
    
    // 4. 計算「總共賺到的點數」
    // 賺取點數來源：已結案歷史訂單 + 進行中訂單 的原始小計 (subtotal)
    const historyEarned = myHistory.reduce((sum, o) => sum + Number(o.subtotal || o.total || 0), 0);
    const activeEarned = myActive.reduce((sum, o) => sum + Number(o.subtotal || o.total || 0), 0);
    const totalPointsEarned = Math.floor((historyEarned + activeEarned) / 50);
    
    // 5. 計算「總共被扣除的點數」
    // 扣除點數來源：已結案歷史訂單扣的 + 進行中訂單扣的 (pointsDeducted)
    const historyDeducted = myHistory.reduce((sum, o) => sum + Number(o.pointsDeducted || 0), 0);
    const activeDeducted = myActive.reduce((sum, o) => sum + Number(o.pointsDeducted || 0), 0);
    const totalPointsDeducted = historyDeducted + activeDeducted;
    
    // 6. 最終可用點數 = 總賺取 - 總扣除
    let finalAvailablePoints = totalPointsEarned - totalPointsDeducted;
    
    return finalAvailablePoints < 0 ? 0 : finalAvailablePoints;
}

function changeDiscountAmount(amount) {
    const totalCartPrice = myCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const userPoints = calculateCurrentUserPoints(); // 撈出後台目前的總點數（例如：11點）
    const maxPossibleDiscount = Math.floor(userPoints / 5); // 算出最大可折抵金額（例如：2元）

    let targetDiscount = currentDiscountRedeemed + amount;
    
    // 邊界防禦：不能小於 0、不能超過點數能折的上限、不能把總價扣到變成負數
    if (targetDiscount < 0) targetDiscount = 0;
    if (targetDiscount > maxPossibleDiscount) targetDiscount = maxPossibleDiscount;
    if (targetDiscount > totalCartPrice) targetDiscount = totalCartPrice;

    currentDiscountRedeemed = targetDiscount;
    
    // 1. 更新「已折抵金額」數字（畫面上的折抵金額）
    const discountDisplay = document.getElementById('discount-amount-display');
    if (discountDisplay) discountDisplay.innerText = currentDiscountRedeemed;
    
    // 🔥【核心修正】2. 讓「可用點數」隨著折抵動態扣除並即時顯示
    // 扣除的點數 = 折抵元數 * 5
    const remainingPoints = userPoints - (currentDiscountRedeemed * 5);
    const availPointsEl = document.getElementById('user-available-points');
    if (availPointsEl) {
        availPointsEl.innerText = remainingPoints;
    }
    
    // 3. 重新計算並更新右側大字「總計金額」顯示
    const finalTotal = totalCartPrice - currentDiscountRedeemed;
    const totalDisplay = document.getElementById('total-price');
    if (totalDisplay) {
        totalDisplay.innerText = `NT$ ${finalTotal}`;
    }
}
function renderCart() {
    const list = document.getElementById('cart-list');
    const totalDisplay = document.getElementById('total-price');
    const btn = document.getElementById('btn-submit');
    const pointSection = document.getElementById('point-redeem-section');

    if (!list) return;

    list.innerHTML = myCart.map(i => `
        <div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
            <div>
                <div style="font-weight:bold;">${i.name}</div>
                <small style="color:#888;">(${i.customString || '固定規格'})</small>
                <div style="color:#e76f51; font-size:0.85rem; margin-top:2px;">單價: NT$ ${i.price}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" onclick="changeCartQty(${i.cartId}, -1)" class="btn-qty-cart">-</button>
                <span style="font-weight:bold; min-width:15px; text-align:center;">${i.quantity}</span>
                <button type="button" onclick="changeCartQty(${i.cartId}, 1)" class="btn-qty-cart">+</button>
            </div>
        </div>
    `).join('');

    const totalCartPrice = myCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    if (currentUser && myCart.length > 0 && pointSection) {
        const points = calculateCurrentUserPoints();
        const maxDiscount = Math.floor(points / 5);
        
        pointSection.style.display = 'block';
        
        const availPointsEl = document.getElementById('user-available-points');
        const maxDiscountEl = document.getElementById('user-max-discount');
        const discountDisplayEl = document.getElementById('discount-amount-display');
        
        if (availPointsEl) availPointsEl.innerText = points;
        if (maxDiscountEl) maxDiscountEl.innerText = maxDiscount;
        
        if (currentDiscountRedeemed > totalCartPrice) currentDiscountRedeemed = totalCartPrice;
        if (currentDiscountRedeemed > maxDiscount) currentDiscountRedeemed = maxDiscount;
        
        if (discountDisplayEl) discountDisplayEl.innerText = currentDiscountRedeemed;
    } else {
        if (pointSection) pointSection.style.display = 'none';
        currentDiscountRedeemed = 0;
    }

    const finalTotal = totalCartPrice - currentDiscountRedeemed;
    if (totalDisplay) totalDisplay.innerText = `NT$ ${finalTotal}`;
    
    if (btn) {
        btn.disabled = (myCart.length === 0 || !currentUser);
    }
}

// ==========================================
// 訂單建立與即時動態更新
// ==========================================
function sendOrder() {
    if (!currentUser) { alert('請先登入會員再提交訂單！'); return; }

    const totalCartPrice = myCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const finalTotal = totalCartPrice - currentDiscountRedeemed;
    const orderNum = Math.floor(Math.random() * 900) + 100;
    
    const orderData = {
        id: orderNum,
        name: currentUser.name,
        phone: currentUser.phone,
        items: [...myCart],
        subtotal: totalCartPrice,                 
        discountUsed: currentDiscountRedeemed,    
        pointsDeducted: currentDiscountRedeemed * 5, // 🔥 確保這行有確實將扣除點數送出 (1元=5點)
        total: finalTotal,                        
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

// ✨ 修正：合併唯一的關閉視窗邏輯
// 修改後的關閉成功彈窗函式：加入強制頁面刷新機制
function closeModal() {
    toggleModal('order-modal', false); // 關閉訂單成功彈窗
    
    myCart = [];                      // 清空前端購物車暫存
    currentDiscountRedeemed = 0;      // 重置點數折抵額度
    
    // 🔥【核心修正】送出成功並關閉視窗後，強制重新整理網頁
    // location.reload() 會重新載入此頁面，完美刷新所有記憶體狀態與最新點數
    location.reload();
}

// ==========================================
// 系統初始化區
// ==========================================
initMenu();
checkLoginSession();

setInterval(() => {
    const trackerModal = document.getElementById('status-tracker-modal');
    if (trackerModal && trackerModal.style.display === 'flex') {
        openOrderStatusModal();
    }
}, 1000);
