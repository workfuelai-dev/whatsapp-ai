/**
 * WhatsApp AI - Frontend Application
 * Interfaz de usuario mejorada para gestionar chats de WhatsApp con IA
 * Incluye funcionalidades avanzadas de UX y interactividad
 */

class WhatsAppAI {
    constructor() {
        this.baseUrl = 'https://rowrcdcrvcprmjasfrql.supabase.co/functions/v1';
        this.token = localStorage.getItem('authToken');
        this.currentChatId = null;
        this.chats = [];
        this.messages = [];
        this.pollInterval = null;
        this.isTyping = false;
        this.searchQuery = '';
        this.activeFilter = 'all';

        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    async initializeApp() {
        this.setupEventListeners();
        
        // Verificar si ya está autenticado
        if (this.token) {
            try {
                const isValid = await this.verifyToken();
                if (isValid) {
                    this.showMainApp();
                    await this.loadChats();
                    this.startPolling();
                } else {
                    // Token inválido, limpiar y mostrar login
                    this.token = null;
                    localStorage.removeItem('authToken');
                    this.showLogin();
                }
            } catch (error) {
                console.error('Error during token verification:', error);
                // Error en verificación, limpiar y mostrar login
                this.token = null;
                localStorage.removeItem('authToken');
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // ===== LISTENERS BÁSICOS =====
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // AI toggle
        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) {
            aiToggle.addEventListener('change', (e) => {
                this.toggleAI(e.target.checked);
            });
        }

        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // ===== FUNCIONALIDADES MEJORADAS =====
        
        // Message input con mejoras
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            // Enter para enviar mensaje
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            messageInput.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                
                // Actualizar contador de caracteres
                this.updateCharCounter(e.target.value.length);
                
                // Habilitar/deshabilitar botón de envío
                this.toggleSendButton(e.target.value.trim().length > 0);
            });
        }

        // ===== NUEVAS FUNCIONALIDADES =====
        
        // Búsqueda de chats
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterAndRenderChats();
            });
        }

        // Filtros de chats
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Actualizar filtro activo
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.activeFilter = e.target.dataset.filter;
                this.filterAndRenderChats();
            });
        });

        // Botón de actualizar
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Scroll to bottom
        const scrollToBottom = document.getElementById('scrollToBottom');
        if (scrollToBottom) {
            scrollToBottom.addEventListener('click', () => {
                this.scrollToBottom();
            });
        }

        // Detectar scroll para mostrar/ocultar botón
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.addEventListener('scroll', () => {
                this.handleScroll();
            });
        }

        // Botón emoji (placeholder)
        const emojiBtn = document.getElementById('emojiBtn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                this.showEmojiPicker();
            });
        }

        // Botón adjuntar (placeholder)
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                this.showAttachmentOptions();
            });
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Iniciando sesión...';
        loginError.style.display = 'none';

        try {
            const response = await fetch(`${this.baseUrl}/simple-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                this.showMainApp();
                await this.loadChats();
                this.startPolling();
            } else {
                loginError.textContent = data.error || 'Error de autenticación';
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Error de conexión. Verifica tu configuración.';
            loginError.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
        }
    }

    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/simple-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    action: 'verify'
                })
            });

            if (!response.ok) {
                console.log('Token verification failed - HTTP', response.status);
                return false;
            }

            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken'); // Usar nombre consistente
        this.stopPolling();
        this.showLogin();
        
        // Limpiar formulario
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showLogin() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'flex';
    }

    async loadChats() {
        try {
            const response = await this.makeAuthenticatedRequest('/manual-override', {
                action: 'get_chats'
            });

            if (response && response.success) {
                this.chats = response.chats || [];
                this.renderChats();
            } else {
                console.error('Failed to load chats:', response);
                this.chats = [];
                this.renderChats();
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            this.chats = [];
            this.renderChats();
            // No mostrar alert para evitar spam de notificaciones
        }
    }

    renderChats() {
        const chatsList = document.getElementById('chatsList');
        
        if (this.chats.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <p>No hay chats disponibles</p>
                    <small>Los chats aparecerán aquí cuando recibas mensajes</small>
                </div>
            `;
            return;
        }

        // Filtrar chats según búsqueda y filtros
        const filteredChats = this.getFilteredChats();

        if (filteredChats.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p>No se encontraron chats</p>
                    <small>Intenta cambiar los filtros o búsqueda</small>
                </div>
            `;
            return;
        }

        chatsList.innerHTML = filteredChats.map(chat => `
            <div class="chat-item ${chat.whatsapp_id === this.currentChatId ? 'active' : ''}" 
                 onclick="app.selectChat('${chat.whatsapp_id}')"
                 data-chat-id="${chat.whatsapp_id}">
                <div class="chat-item-avatar">
                    <span>${this.getContactInitials(chat.contact_name || chat.whatsapp_id)}</span>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="contact-name">${this.highlightSearchTerm(chat.contact_name || chat.whatsapp_id)}</span>
                        <span class="chat-time">${this.formatLastActivity(chat.last_activity)}</span>
                    </div>
                    <div class="chat-item-preview">
                        <span class="last-message">${chat.last_message || 'Sin mensajes'}</span>
                        <div class="chat-badges">
                            <span class="ai-status ${chat.ai_enabled ? 'ai-enabled' : 'ai-disabled'}">
                                ${chat.ai_enabled ? '🤖' : '👨‍💼'}
                            </span>
                            ${chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Actualizar estadísticas
        this.updateStats();
    }

    // ===== NUEVOS MÉTODOS PARA FUNCIONALIDADES MEJORADAS =====

    getFilteredChats() {
        let filtered = this.chats;

        // Filtrar por búsqueda
        if (this.searchQuery) {
            filtered = filtered.filter(chat => 
                (chat.contact_name || chat.whatsapp_id).toLowerCase().includes(this.searchQuery) ||
                (chat.last_message || '').toLowerCase().includes(this.searchQuery)
            );
        }

        // Filtrar por tipo
        switch (this.activeFilter) {
            case 'ai':
                filtered = filtered.filter(chat => chat.ai_enabled);
                break;
            case 'manual':
                filtered = filtered.filter(chat => !chat.ai_enabled);
                break;
            case 'unread':
                filtered = filtered.filter(chat => chat.unread_count > 0);
                break;
            default:
                // 'all' - no filtrar
                break;
        }

        return filtered.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
    }

    filterAndRenderChats() {
        this.renderChats();
    }

    getContactInitials(name) {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }

    highlightSearchTerm(text) {
        if (!this.searchQuery) return text;
        const regex = new RegExp(`(${this.searchQuery})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    updateStats() {
        const totalChats = document.getElementById('totalChats');
        const aiChats = document.getElementById('aiChats');
        
        if (totalChats) totalChats.textContent = this.chats.length;
        if (aiChats) aiChats.textContent = this.chats.filter(chat => chat.ai_enabled).length;
    }

    updateCharCounter(length) {
        const charCounter = document.getElementById('charCounter');
        if (charCounter) {
            charCounter.textContent = `${length}/4096`;
            if (length > 3800) {
                charCounter.style.color = '#ff4444';
            } else if (length > 3000) {
                charCounter.style.color = '#ff8800';
            } else {
                charCounter.style.color = 'var(--text-secondary)';
            }
        }
    }

    toggleSendButton(enabled) {
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.disabled = !enabled;
        }
    }

    handleScroll() {
        const messagesContainer = document.getElementById('messagesContainer');
        const scrollToBottomBtn = document.getElementById('scrollToBottom');
        
        if (!messagesContainer || !scrollToBottomBtn) return;

        const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= 
                           messagesContainer.scrollHeight - 100;
        
        scrollToBottomBtn.style.display = isNearBottom ? 'none' : 'block';
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }

        await this.loadChats();
        if (this.currentChatId) {
            await this.loadMessages(this.currentChatId);
        }
        this.showSuccess('Datos actualizados');
    }

    showEmojiPicker() {
        // Placeholder para funcionalidad de emojis
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const emojis = ['😊', '😂', '❤️', '👍', '🙏', '😍', '😭', '🔥', '💯', '👏'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            messageInput.value += randomEmoji;
            messageInput.focus();
            
            // Trigger input event para auto-resize y contador
            messageInput.dispatchEvent(new Event('input'));
        }
    }

    showAttachmentOptions() {
        // Placeholder para opciones de adjuntos
        this.showSuccess('Funcionalidad de adjuntos próximamente');
    }

    showTypingIndicator(show = true) {
        const typingContainer = document.getElementById('typingContainer');
        if (typingContainer) {
            typingContainer.style.display = show ? 'flex' : 'none';
        }
    }

    async selectChat(whatsappId) {
        this.currentChatId = whatsappId;
        const chat = this.chats.find(c => c.whatsapp_id === whatsappId);
        
        if (!chat) return;

        // Actualizar UI del header
        document.getElementById('currentChatName').textContent = chat.contact_name || whatsappId;
        document.getElementById('currentChatId').textContent = whatsappId;
        document.getElementById('aiToggle').checked = chat.ai_enabled;
        
        // Actualizar avatar del contacto
        const contactAvatar = document.getElementById('contactAvatar');
        if (contactAvatar) {
            contactAvatar.textContent = this.getContactInitials(chat.contact_name || whatsappId);
        }

        // Mostrar vista del chat
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatView').style.display = 'flex';

        // Cargar mensajes con indicador de carga
        this.showLoadingMessages();
        await this.loadMessages(whatsappId);
        
        // Actualizar lista de chats para mostrar selección
        this.renderChats();

        // Auto-focus en input de mensaje
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }

        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100);
    }

    showLoadingMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="loading-messages">
                    <div class="loading-spinner"></div>
                    <p>Cargando mensajes...</p>
                </div>
            `;
        }
    }

    async loadMessages(whatsappId) {
        try {
            const response = await this.makeAuthenticatedRequest('/manual-override', {
                action: 'get_messages',
                whatsapp_id: whatsappId
            });

            if (response && response.success) {
                this.messages = response.messages || [];
                this.renderMessages();
                this.scrollToBottom();
            } else {
                console.error('Failed to load messages:', response);
                this.messages = [];
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages = [];
            this.renderMessages();
            // No mostrar alert para evitar spam
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        
        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>No hay mensajes aún</p>
                    <small>La conversación aparecerá aquí</small>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = this.messages.map(message => `
            <div class="message ${message.direction}">
                <div class="message-bubble">
                    <div>${this.escapeHtml(message.message_text)}</div>
                    <div class="message-time">
                        ${this.formatMessageTime(message.created_at)}
                        ${message.is_ai_generated ? '<span class="ai-badge">IA</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async toggleAI(enabled) {
        if (!this.currentChatId) return;

        try {
            const response = await this.makeAuthenticatedRequest('/manual-override', {
                action: 'toggle_ai',
                whatsapp_id: this.currentChatId,
                ai_enabled: enabled
            });

            if (response.success) {
                // Actualizar chat local
                const chat = this.chats.find(c => c.whatsapp_id === this.currentChatId);
                if (chat) {
                    chat.ai_enabled = enabled;
                }
                this.renderChats();
                this.showSuccess(`IA ${enabled ? 'activada' : 'desactivada'} para este chat`);
            }
        } catch (error) {
            console.error('Error toggling AI:', error);
            this.showError('Error al cambiar configuración de IA');
            // Revertir toggle
            document.getElementById('aiToggle').checked = !enabled;
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const message = messageInput.value.trim();

        if (!message || !this.currentChatId) return;

        // Deshabilitar controles
        sendBtn.disabled = true;
        messageInput.disabled = true;
        
        // Mostrar indicador de envío
        const originalBtnContent = sendBtn.innerHTML;
        sendBtn.innerHTML = '<div class="sending-spinner"></div>';

        try {
            // Mostrar mensaje como "enviando" inmediatamente
            this.addOptimisticMessage(message);
            
            // Limpiar input
            messageInput.value = '';
            messageInput.style.height = 'auto';
            this.updateCharCounter(0);

            // Simular typing de IA si está habilitado
            const chat = this.chats.find(c => c.whatsapp_id === this.currentChatId);
            if (chat && chat.ai_enabled) {
                setTimeout(() => this.showTypingIndicator(true), 1000);
            }

            const phoneNumberId = '673644539175036';

            const response = await this.makeAuthenticatedRequest('/manual-override', {
                action: 'send_message',
                whatsapp_id: this.currentChatId,
                message: message,
                phone_number_id: phoneNumberId
            });

            if (response && response.success) {
                // Recargar mensajes para obtener el estado real
                await this.loadMessages(this.currentChatId);
                this.showSuccess('Mensaje enviado');
                
                // Ocultar typing indicator después de un tiempo
                if (chat && chat.ai_enabled) {
                    setTimeout(() => this.showTypingIndicator(false), 3000);
                }
            } else {
                console.error('Failed to send message:', response);
                this.showError('Error al enviar mensaje');
                this.removeOptimisticMessage();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Error al enviar mensaje');
            this.removeOptimisticMessage();
        } finally {
            // Restaurar controles
            sendBtn.disabled = false;
            messageInput.disabled = false;
            sendBtn.innerHTML = originalBtnContent;
            messageInput.focus();
        }
    }

    addOptimisticMessage(messageText) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const tempMessage = document.createElement('div');
        tempMessage.className = 'message outgoing optimistic';
        tempMessage.id = 'optimistic-message';
        tempMessage.innerHTML = `
            <div class="message-bubble">
                <div>${this.escapeHtml(messageText)}</div>
                <div class="message-time">
                    Enviando... <span class="sending-indicator">⏳</span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(tempMessage);
        this.scrollToBottom();
    }

    removeOptimisticMessage() {
        const optimisticMsg = document.getElementById('optimistic-message');
        if (optimisticMsg) {
            optimisticMsg.remove();
        }
    }

    async makeAuthenticatedRequest(endpoint, body) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(body)
            });

            if (response.status === 401) {
                console.log('Session expired, logging out...');
                this.logout();
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }

    startPolling() {
        // Polling cada 10 segundos para nuevos mensajes (aumentado para reducir carga)
        this.pollInterval = setInterval(() => {
            // Solo hacer polling si estamos autenticados
            if (this.token) {
                this.loadChats();
                if (this.currentChatId) {
                    this.loadMessages(this.currentChatId);
                }
            }
        }, 10000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatLastActivity(timestamp) {
        if (!timestamp) return 'Sin actividad';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close">×</button>
        `;

        // Agregar al DOM
        document.body.appendChild(notification);

        // Mostrar con animación
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-ocultar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);

        // Permitir cerrar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Inicializar la aplicación
const app = new WhatsAppAI();
