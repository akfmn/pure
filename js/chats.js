// ============================================
// СИСТЕМА ЧАТОВ
// ============================================

let currentChatId = null;
let currentChatUserId = null;
let chatPollingInterval = null;
let unreadCheckInterval = null;
let chatsListPollingInterval = null;
let currentChatBlocked = false;
let currentChatBlockedByMe = false;

// Переменные для ответа на сообщение
let replyToMessageId = null;
let replyToMessageText = null;
let replyToSenderName = null;

// Обновить индикатор непрочитанных в меню
function updateUnreadIndicator(count) {
    console.log('updateUnreadIndicator called with:', count);
    const dot = document.getElementById('navUnreadDot');
    if (dot) {
        dot.style.display = count > 0 ? 'block' : 'none';
    }
}

// Проверить непрочитанные сообщения
async function checkUnreadMessages() {
    if (!currentUserId) return;
    
    try {
        const response = await fetch(`${API_URL}/chats.php?action=list&user_id=${currentUserId}`);
        const data = await response.json();
        
        if (data.success && data.chats) {
            const totalUnread = data.chats.reduce((sum, chat) => sum + (parseInt(chat.unread_count) || 0), 0);
            updateUnreadIndicator(totalUnread);
        }
    } catch (error) {
        console.error('Error checking unread:', error);
    }
}

// Запустить периодическую проверку непрочитанных
function startUnreadCheck() {
    stopUnreadCheck();
    checkUnreadMessages();
    unreadCheckInterval = setInterval(checkUnreadMessages, 30000);
}

// Остановить проверку
function stopUnreadCheck() {
    if (unreadCheckInterval) {
        clearInterval(unreadCheckInterval);
        unreadCheckInterval = null;
    }
}

// Открыть список чатов
async function openChatsScreen() {
    if (!navigationHistory.includes('chatsScreen')) {
        navigationHistory.push('chatsScreen');
        window.history.pushState({screen: 'chatsScreen'}, '', window.location.href);
    }
    showScreen('chatsScreen');
    await loadChatsList();
    startChatsListPolling();
}

// Запустить polling списка чатов
function startChatsListPolling() {
    stopChatsListPolling();
    chatsListPollingInterval = setInterval(async () => {
        const chatsScreen = document.getElementById('chatsScreen');
        if (chatsScreen && chatsScreen.classList.contains('active')) {
            await loadChatsList();
        }
    }, 5000);
}

// Остановить polling списка чатов
function stopChatsListPolling() {
    if (chatsListPollingInterval) {
        clearInterval(chatsListPollingInterval);
        chatsListPollingInterval = null;
    }
}

// Загрузить список чатов
async function loadChatsList() {
    const chatsList = document.getElementById('chatsList');
    const chatsEmpty = document.getElementById('chatsEmpty');
    
    try {
        const response = await fetch(`${API_URL}/chats.php?action=list&user_id=${currentUserId}`);
        const data = await response.json();
        
        if (data.success && data.chats && data.chats.length > 0) {
            chatsList.style.display = 'block';
            chatsEmpty.style.display = 'none';
            
            const totalUnread = data.chats.reduce((sum, chat) => sum + (parseInt(chat.unread_count) || 0), 0);
            updateUnreadIndicator(totalUnread);
            
            chatsList.innerHTML = data.chats.map(chat => `
                <div class="chat-item" onclick="openChat(${chat.other_user_id}, ${chat.chat_id})">
                    <div class="chat-item-avatar">
                        ${chat.other_user_avatar || '👤'}
                        ${chat.is_online == 1 ? '<div class="chat-item-online"></div>' : ''}
                    </div>
                    <div class="chat-item-content">
                        <div class="chat-item-header">
                            <div class="chat-item-name">${chat.other_user_name}</div>
                            <div class="chat-item-time">${formatChatTime(chat.last_message_time)}</div>
                        </div>
                        <div class="chat-item-message ${chat.unread_count > 0 ? 'unread' : ''}">${chat.last_message || 'Нет сообщений'}</div>
                    </div>
                    ${chat.unread_count > 0 ? `<div class="chat-item-unread">${chat.unread_count}</div>` : ''}
                </div>
            `).join('');
        } else {
            chatsList.style.display = 'none';
            chatsEmpty.style.display = 'flex';
            updateUnreadIndicator(0);
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// Форматирование времени для списка чатов
function formatChatTime(dateString) {
    if (!dateString) return '';
    let date;
    if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
    } else {
        date = new Date(dateString.replace(' ', 'T') + 'Z');
    }
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'сейчас';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин';
    if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Открыть чат с пользователем
async function openChat(userId, chatId = null) {
    currentChatUserId = userId;
    currentChatId = chatId;
    currentChatBlocked = false;
    currentChatBlockedByMe = false;
    
    stopChatsListPolling();
    
    navigationHistory.push('chatScreen');
    window.history.pushState({screen: 'chatScreen'}, '', window.location.href);
    
    showScreen('chatScreen');
    
    try {
        let url = `${API_URL}/chats.php?action=messages&user_id=${currentUserId}`;
        if (chatId) {
            url += `&chat_id=${chatId}`;
        } else {
            url += `&other_user_id=${userId}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentChatId = data.chat_id;
            currentChatBlocked = data.is_blocked || false;
            currentChatBlockedByMe = data.blocked_by_me || false;
            
            document.getElementById('chatAvatar').textContent = data.other_user.avatar || '👤';
            document.getElementById('chatUserName').textContent = data.other_user.name;
            
            const statusEl = document.getElementById('chatUserStatus');
            if (data.other_user.is_online == 1) {
                statusEl.textContent = 'В сети';
                statusEl.classList.remove('offline');
            } else {
                statusEl.textContent = 'Не в сети';
                statusEl.classList.add('offline');
            }
            
            updateBlockButton();
            updateChatInput();
            
            document.getElementById('chatMessages').dataset.initialized = '';
            
            displayMessages(data.messages);
            
            if (currentChatId) {
                startChatPolling();
            }
        }
    } catch (error) {
        console.error('Error opening chat:', error);
    }
}

// Обновление кнопки блокировки
function updateBlockButton() {
    const btn = document.getElementById('blockUserBtn');
    if (btn) {
        if (currentChatBlockedByMe) {
            btn.innerHTML = '✓ Разблокировать';
            btn.onclick = unblockChatUser;
        } else {
            btn.innerHTML = '🚫 Заблокировать';
            btn.onclick = blockChatUser;
        }
    }
}

// Обновление поля ввода при блокировке
function updateChatInput() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    
    if (currentChatBlocked) {
        input.disabled = true;
        input.placeholder = 'Чат заблокирован';
        sendBtn.disabled = true;
    } else {
        input.disabled = false;
        input.placeholder = 'Сообщение...';
        sendBtn.disabled = false;
    }
}

// Отображение сообщений
function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="chats-empty-hint" style="text-align: center; padding: 40px;">Напишите первое сообщение!</div>';
        return;
    }
    
    let lastReadOutgoingIndex = -1;
    let lastUnreadOutgoingIndex = -1;
    
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.sender_id == currentUserId) {
            if (msg.is_read == 1 && lastReadOutgoingIndex === -1) {
                lastReadOutgoingIndex = i;
            }
            if (msg.is_read == 0 && lastUnreadOutgoingIndex === -1) {
                lastUnreadOutgoingIndex = i;
            }
        }
    }
    
    container.innerHTML = messages.map((msg, index) => {
        const isOutgoing = msg.sender_id == currentUserId;
        const replyHtml = msg.reply_to_id ? `
            <div class="message-reply" onclick="scrollToMessage(${msg.reply_to_id})">
                <div class="message-reply-name">${msg.reply_sender_name || 'Сообщение'}</div>
                <div class="message-reply-text">${(msg.reply_message || '').substring(0, 50)}${msg.reply_message && msg.reply_message.length > 50 ? '...' : ''}</div>
            </div>
        ` : '';
        
        let statusHtml = '';
        if (isOutgoing) {
            if (index === lastReadOutgoingIndex && lastUnreadOutgoingIndex === -1) {
                statusHtml = '<div class="message-status">Прочитано</div>';
            } else if (index === lastReadOutgoingIndex && lastUnreadOutgoingIndex > lastReadOutgoingIndex) {
                statusHtml = '<div class="message-status">Прочитано</div>';
            } else if (index === lastUnreadOutgoingIndex) {
                statusHtml = '<div class="message-status">Доставлено</div>';
            }
        }
        
        return `
        <div class="message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}" 
             data-message-id="${msg.id}" 
             data-message-text="${(msg.message || '').replace(/"/g, '&quot;')}"
             data-sender-name="${msg.sender_name || ''}"
             data-sender-id="${msg.sender_id}">
            ${replyHtml}
            ${msg.message}
            <div class="message-time">${formatMessageTime(msg.created_at)}</div>
            ${statusHtml}
        </div>
    `}).join('');
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom || !container.dataset.initialized) {
        container.scrollTop = container.scrollHeight;
        container.dataset.initialized = 'true';
    }
    
    initMessageSwipes();
}

// Инициализация свайпов для сообщений
function initMessageSwipes() {
    const messages = document.querySelectorAll('.message');
    
    messages.forEach(msg => {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        const isOutgoing = msg.classList.contains('message-outgoing');
        
        msg.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            msg.style.transition = 'none';
        }, { passive: true });
        
        msg.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            let diff = currentX - startX;
            
            if (isOutgoing) {
                diff = Math.max(0, Math.min(diff, 80));
            } else {
                diff = Math.min(0, Math.max(diff, -80));
            }
            
            msg.style.transform = `translateX(${diff}px)`;
        }, { passive: true });
        
        msg.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = currentX - startX;
            msg.style.transition = 'transform 0.2s ease';
            msg.style.transform = 'translateX(0)';
            
            if ((isOutgoing && diff > 50) || (!isOutgoing && diff < -50)) {
                const messageId = msg.dataset.messageId;
                const messageText = msg.dataset.messageText;
                const senderName = msg.dataset.senderName;
                const senderId = msg.dataset.senderId;
                
                selectMessageForReply(parseInt(messageId), messageText, senderName, parseInt(senderId));
                
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
            }
            
            startX = 0;
            currentX = 0;
        });
    });
}

// Выбор сообщения для ответа
function selectMessageForReply(messageId, messageText, senderName, senderId) {
    replyToMessageId = messageId;
    replyToMessageText = messageText;
    replyToSenderName = senderId == currentUserId ? 'Вы' : senderName;
    
    showReplyPreview();
}

// Показать превью ответа
function showReplyPreview() {
    let preview = document.getElementById('replyPreview');
    if (!preview) {
        const inputContainer = document.querySelector('.chat-input-container');
        preview = document.createElement('div');
        preview.id = 'replyPreview';
        preview.className = 'reply-preview';
        inputContainer.insertBefore(preview, inputContainer.firstChild);
    }
    
    preview.innerHTML = `
        <div class="reply-preview-content">
            <div class="reply-preview-name">${replyToSenderName}</div>
            <div class="reply-preview-text">${replyToMessageText.substring(0, 50)}${replyToMessageText.length > 50 ? '...' : ''}</div>
        </div>
        <div class="reply-preview-close" onclick="cancelReply(event)">✕</div>
    `;
    preview.style.display = 'flex';
    
    document.getElementById('chatInput').focus();
}

// Отменить ответ
function cancelReply(event) {
    if (event) event.stopPropagation();
    replyToMessageId = null;
    replyToMessageText = null;
    replyToSenderName = null;
    
    const preview = document.getElementById('replyPreview');
    if (preview) {
        preview.style.display = 'none';
    }
}

// Прокрутка к сообщению
function scrollToMessage(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
        message.classList.add('message-highlighted');
        setTimeout(() => message.classList.remove('message-highlighted'), 1500);
    }
}

// Форматирование времени сообщения
function formatMessageTime(dateString) {
    let date;
    if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
    } else {
        date = new Date(dateString.replace(' ', 'T') + 'Z');
    }
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Отправка сообщения
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const response = await fetch(`${API_URL}/chats.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_id: currentUserId,
                receiver_id: currentChatUserId,
                chat_id: currentChatId,
                text: text,
                reply_to_id: replyToMessageId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            
            const wasNewChat = !currentChatId;
            currentChatId = data.chat_id;
            
            if (wasNewChat) {
                startChatPolling();
            }
            
            const container = document.getElementById('chatMessages');
            const emptyHint = container.querySelector('.chats-empty-hint');
            if (emptyHint) emptyHint.remove();
            
            const replyHtml = replyToMessageId ? `
                <div class="message-reply">
                    <div class="message-reply-name">${replyToSenderName}</div>
                    <div class="message-reply-text">${replyToMessageText.substring(0, 50)}${replyToMessageText.length > 50 ? '...' : ''}</div>
                </div>
            ` : '';
            
            container.innerHTML += `
                <div class="message message-outgoing" data-message-id="${data.message_id}">
                    ${replyHtml}
                    ${text}
                    <div class="message-time">${formatMessageTime(new Date().toISOString())}</div>
                    <div class="message-status">Доставлено</div>
                </div>
            `;
            container.scrollTop = container.scrollHeight;
            
            initMessageSwipes();
            cancelReply();
        } else {
            await showError(data.error || 'Не удалось отправить сообщение');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Polling для новых сообщений
function startChatPolling() {
    stopChatPolling();
    chatPollingInterval = setInterval(async () => {
        if (currentChatId) {
            try {
                const response = await fetch(`${API_URL}/chats.php?action=messages&user_id=${currentUserId}&chat_id=${currentChatId}`);
                const data = await response.json();
                if (data.success) {
                    displayMessages(data.messages);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }
    }, 3000);
}

function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

// Закрыть чат
function closeChat() {
    showScreen('chatsScreen');
    loadChatsList();
    startChatsListPolling();
}

// Открыть профиль пользователя из чата
function openChatUserProfile() {
    if (currentChatUserId) {
        stopChatPolling();
        openUserProfile(currentChatUserId);
    }
}

// Меню чата
function showChatMenu() {
    document.getElementById('chatMenuPopup').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
}

function closeChatMenu() {
    document.getElementById('chatMenuPopup').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
}

async function reportChatUser() {
    closeChatMenu();
    
    if (!currentChatUserId) return;
    
    const confirmed = await showConfirm(
        'Вы уверены, что хотите пожаловаться на этого пользователя?',
        'Жалоба на пользователя',
        '⚠️'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_URL}/reports.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporter_id: currentUserId,
                    reported_user_id: currentChatUserId,
                    chat_id: currentChatId,
                    type: 'user',
                    reason: 'Жалоба на пользователя из чата'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await showSuccess('Жалоба отправлена');
            } else {
                await showError(data.error || 'Ошибка отправки жалобы');
            }
        } catch (error) {
            console.error('Report error:', error);
            await showError('Ошибка отправки жалобы');
        }
    }
}

async function deleteChat() {
    closeChatMenu();
    
    if (!currentChatId) return;
    
    const confirmed = await showConfirm(
        'Удалить этот чат? Все сообщения будут удалены.',
        'Удаление чата',
        '🗑'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_URL}/chats.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: currentChatId,
                    user_id: currentUserId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await showSuccess('Чат удалён');
                closeChat();
            } else {
                await showError(data.error || 'Ошибка удаления чата');
            }
        } catch (error) {
            console.error('Delete chat error:', error);
            await showError('Ошибка удаления чата');
        }
    }
}

// Заблокировать пользователя
async function blockChatUser() {
    closeChatMenu();
    
    if (!currentChatUserId) return;
    
    const confirmed = await showConfirm(
        'Заблокировать этого пользователя? Вы не сможете обмениваться сообщениями.',
        'Блокировка',
        '🚫'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_URL}/chats.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'block',
                    blocker_id: currentUserId,
                    blocked_id: currentChatUserId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentChatBlocked = true;
                currentChatBlockedByMe = true;
                updateBlockButton();
                updateChatInput();
                await showSuccess('Пользователь заблокирован');
            } else {
                await showError(data.error || 'Ошибка блокировки');
            }
        } catch (error) {
            console.error('Block user error:', error);
            await showError('Ошибка блокировки');
        }
    }
}

// Разблокировать пользователя
async function unblockChatUser() {
    closeChatMenu();
    
    if (!currentChatUserId) return;
    
    const confirmed = await showConfirm(
        'Разблокировать этого пользователя?',
        'Разблокировка',
        '✓'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_URL}/chats.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'unblock',
                    blocker_id: currentUserId,
                    blocked_id: currentChatUserId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentChatBlocked = false;
                currentChatBlockedByMe = false;
                updateBlockButton();
                updateChatInput();
                await showSuccess('Пользователь разблокирован');
            } else {
                await showError(data.error || 'Ошибка разблокировки');
            }
        } catch (error) {
            console.error('Unblock user error:', error);
            await showError('Ошибка разблокировки');
        }
    }
}
