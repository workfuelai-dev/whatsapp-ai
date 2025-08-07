/**
 * WhatsApp AI - Frontend Application
 * Interfaz de usuario para gestionar chats de WhatsApp con IA
 */

class WhatsAppAI {
    constructor() {
        this.baseUrl = 'https://rowrcdcrvcprmjasfrql.supabase.co/functions/v1'; // URL correcta con /functions/v1
        this.token = localStorage.getItem('authToken'); // Usar el mismo nombre que en el HTML
        this.currentChatId = null;
        this.chats = [];
        this.messages = [];
        this.pollInterval = null;

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
        // Verificar que los elementos existan antes de agregar listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) {
            aiToggle.addEventListener('change', (e) => {
                this.toggleAI(e.target.checked);
            });
        }

        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

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
                    <p>No hay chats disponibles</p>
                    <small>Los chats aparecerán aquí cuando recibas mensajes</small>
                </div>
            `;
            return;
        }

        chatsList.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.whatsapp_id === this.currentChatId ? 'active' : ''}" 
                 onclick="app.selectChat('${chat.whatsapp_id}')">
                <div class="chat-item-header">
                    <span class="contact-name">${chat.contact_name || chat.whatsapp_id}</span>
                    <span class="ai-status ${chat.ai_enabled ? 'ai-enabled' : 'ai-disabled'}">
                        ${chat.ai_enabled ? '🤖 IA' : '👨‍💼 Manual'}
                    </span>
                </div>
                <div class="last-message">
                    ${this.formatLastActivity(chat.last_activity)}
                </div>
                ${chat.unread_count > 0 ? `<div class="unread-badge">${chat.unread_count}</div>` : ''}
            </div>
        `).join('');
    }

    async selectChat(whatsappId) {
        this.currentChatId = whatsappId;
        const chat = this.chats.find(c => c.whatsapp_id === whatsappId);
        
        if (!chat) return;

        // Actualizar UI
        document.getElementById('currentChatName').textContent = chat.contact_name || whatsappId;
        document.getElementById('currentChatId').textContent = whatsappId;
        document.getElementById('aiToggle').checked = chat.ai_enabled;
        
        // Mostrar vista del chat
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatView').style.display = 'flex';

        // Cargar mensajes
        await this.loadMessages(whatsappId);
        
        // Actualizar lista de chats
        this.renderChats();
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

        sendBtn.disabled = true;
        messageInput.disabled = true;

        try {
            // Usar el phone_number_id configurado en las variables de entorno
            const phoneNumberId = '673644539175036'; // Tu Phone Number ID

            const response = await this.makeAuthenticatedRequest('/manual-override', {
                action: 'send_message',
                whatsapp_id: this.currentChatId,
                message: message,
                phone_number_id: phoneNumberId
            });

            if (response && response.success) {
                messageInput.value = '';
                messageInput.style.height = 'auto';
                
                // Recargar mensajes en lugar de agregar manualmente
                await this.loadMessages(this.currentChatId);
                this.showSuccess('Mensaje enviado');
            } else {
                console.error('Failed to send message:', response);
                this.showError('Error al enviar mensaje');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Error al enviar mensaje');
        } finally {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
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
        // Implementar notificación de éxito en consola
        console.log('✅ Success:', message);
    }

    showError(message) {
        // Solo log en consola, no alert para evitar spam
        console.error('❌ Error:', message);
    }
}

// Inicializar la aplicación
const app = new WhatsAppAI();
