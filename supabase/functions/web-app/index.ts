/**
 * Web Application Server
 * Sirve la interfaz web estática para gestionar chats de WhatsApp
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathname = url.pathname

  try {
    // Servir index.html como página principal
    if (pathname === '/' || pathname === '/functions/v1/web-app' || pathname === '/functions/v1/web-app/') {
      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp AI - Panel de Control</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f0f2f5;
            height: 100vh;
            display: flex;
        }
        
        .sidebar {
            width: 300px;
            background: white;
            border-right: 1px solid #e9eaed;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: #00a884;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .chat-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
        }
        
        .chat-item {
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .chat-item:hover {
            background: #f5f5f5;
        }
        
        .chat-item.active {
            background: #e7f3ff;
            border-right: 3px solid #00a884;
        }
        
        .chat-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .chat-preview {
            color: #667781;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .ai-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
            margin-top: 5px;
        }
        
        .ai-enabled {
            background: #d4edda;
            color: #155724;
        }
        
        .ai-disabled {
            background: #f8d7da;
            color: #721c24;
        }
        
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #e5ddd5;
        }
        
        .chat-header {
            background: white;
            padding: 20px;
            border-bottom: 1px solid #e9eaed;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .toggle-ai {
            background: #00a884;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .toggle-ai.disabled {
            background: #dc3545;
        }
        
        .messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .message {
            max-width: 70%;
            padding: 10px 15px;
            border-radius: 10px;
            word-wrap: break-word;
        }
        
        .message.incoming {
            background: white;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }
        
        .message.outgoing {
            background: #dcf8c6;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }
        
        .message.ai {
            background: #e3f2fd;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
            border-left: 3px solid #2196f3;
        }
        
        .message-info {
            font-size: 12px;
            color: #667781;
            margin-top: 5px;
        }
        
        .input-area {
            background: white;
            padding: 20px;
            border-top: 1px solid #e9eaed;
            display: flex;
            gap: 10px;
        }
        
        .message-input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 25px;
            outline: none;
            font-size: 14px;
        }
        
        .send-btn {
            background: #00a884;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .send-btn:hover {
            background: #128c7e;
        }
        
        .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #00a884;
        }
        
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            width: 400px;
            text-align: center;
        }
        
        .login-input {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .login-btn {
            width: 100%;
            background: #00a884;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        
        .login-btn:hover {
            background: #128c7e;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: #667781;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">Cargando...</div>
    </div>

    <script>
        // Configuración de la API
        const API_BASE = 'https://rowrcdcrvcprmjasfrql.supabase.co/functions/v1';
        
        // Estado de la aplicación
        let currentUser = null;
        let currentChat = null;
        let chats = [];
        let messages = [];
        
        // Elementos del DOM
        const app = document.getElementById('app');
        
        // Inicializar aplicación
        init();
        
        async function init() {
            const token = localStorage.getItem('authToken');
            if (token) {
                currentUser = { token };
                await loadDashboard();
            } else {
                showLogin();
            }
        }
        
        function showLogin() {
            app.innerHTML = \`
                <div class="login-container">
                    <div class="login-box">
                        <h2 style="margin-bottom: 30px; color: #00a884;">WhatsApp AI</h2>
                        <div id="loginError"></div>
                        <input type="text" id="username" class="login-input" placeholder="Usuario" />
                        <input type="password" id="password" class="login-input" placeholder="Contraseña" />
                        <button onclick="login()" class="login-btn">Iniciar Sesión</button>
                    </div>
                </div>
            \`;
        }
        
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            
            if (!username || !password) {
                errorDiv.innerHTML = '<div class="error">Por favor ingresa usuario y contraseña</div>';
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/simple-auth\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('authToken', data.token);
                    currentUser = { token: data.token };
                    await loadDashboard();
                } else {
                    errorDiv.innerHTML = \`<div class="error">\${data.error || 'Error de autenticación'}</div>\`;
                }
            } catch (error) {
                errorDiv.innerHTML = '<div class="error">Error de conexión</div>';
            }
        }
        
        async function loadDashboard() {
            app.innerHTML = \`
                <div class="sidebar">
                    <div class="header">
                        <h3>WhatsApp AI</h3>
                        <button onclick="logout()" style="background: none; border: 1px solid white; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cerrar Sesión</button>
                    </div>
                    <div class="chat-list" id="chatList">
                        <div class="loading">Cargando chats...</div>
                    </div>
                </div>
                <div class="chat-area">
                    <div class="chat-header">
                        <div>
                            <h3 id="chatName">Selecciona un chat</h3>
                        </div>
                        <button id="toggleAI" class="toggle-ai" onclick="toggleAI()" style="display: none;">
                            AI: Habilitada
                        </button>
                    </div>
                    <div class="messages" id="messages">
                        <div style="text-align: center; color: #667781; margin-top: 50px;">
                            Selecciona un chat para ver los mensajes
                        </div>
                    </div>
                    <div class="input-area">
                        <input type="text" id="messageInput" class="message-input" placeholder="Escribe un mensaje..." onkeypress="if(event.key==='Enter') sendMessage()" disabled />
                        <button onclick="sendMessage()" class="send-btn" id="sendBtn" disabled>Enviar</button>
                    </div>
                </div>
            \`;
            
            await loadChats();
        }
        
        async function loadChats() {
            try {
                const response = await fetch(\`\${API_BASE}/manual-override\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${currentUser.token}\`
                    },
                    body: JSON.stringify({ action: 'list_chats' })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    chats = data.chats || [];
                    renderChats();
                } else {
                    document.getElementById('chatList').innerHTML = '<div class="error">Error cargando chats</div>';
                }
            } catch (error) {
                document.getElementById('chatList').innerHTML = '<div class="error">Error de conexión</div>';
            }
        }
        
        function renderChats() {
            const chatList = document.getElementById('chatList');
            
            if (chats.length === 0) {
                chatList.innerHTML = '<div style="padding: 20px; text-align: center; color: #667781;">No hay chats disponibles</div>';
                return;
            }
            
            chatList.innerHTML = chats.map(chat => \`
                <div class="chat-item \${currentChat && currentChat.whatsapp_id === chat.whatsapp_id ? 'active' : ''}" 
                     onclick="selectChat('\${chat.whatsapp_id}')">
                    <div class="chat-name">\${chat.contact_name}</div>
                    <div class="chat-preview">\${chat.last_message || 'Sin mensajes'}</div>
                    <span class="ai-status \${chat.ai_enabled ? 'ai-enabled' : 'ai-disabled'}">
                        IA: \${chat.ai_enabled ? 'ON' : 'OFF'}
                    </span>
                </div>
            \`).join('');
        }
        
        async function selectChat(whatsappId) {
            currentChat = chats.find(c => c.whatsapp_id === whatsappId);
            if (!currentChat) return;
            
            // Actualizar UI
            document.getElementById('chatName').textContent = currentChat.contact_name;
            document.getElementById('toggleAI').style.display = 'block';
            document.getElementById('toggleAI').textContent = \`IA: \${currentChat.ai_enabled ? 'Habilitada' : 'Deshabilitada'}\`;
            document.getElementById('toggleAI').className = \`toggle-ai \${currentChat.ai_enabled ? '' : 'disabled'}\`;
            document.getElementById('messageInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;
            
            renderChats(); // Re-render para mostrar el chat activo
            await loadMessages();
        }
        
        async function loadMessages() {
            try {
                const response = await fetch(\`\${API_BASE}/manual-override\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${currentUser.token}\`
                    },
                    body: JSON.stringify({ 
                        action: 'get_messages',
                        whatsapp_id: currentChat.whatsapp_id
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messages = data.messages || [];
                    renderMessages();
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }
        
        function renderMessages() {
            const messagesDiv = document.getElementById('messages');
            
            if (messages.length === 0) {
                messagesDiv.innerHTML = '<div style="text-align: center; color: #667781; margin-top: 50px;">No hay mensajes en este chat</div>';
                return;
            }
            
            messagesDiv.innerHTML = messages.map(msg => {
                const messageClass = msg.direction === 'incoming' ? 'incoming' : 
                                   msg.is_ai_generated ? 'ai' : 'outgoing';
                const timestamp = new Date(msg.created_at).toLocaleString();
                const prefix = msg.is_ai_generated ? '🤖 IA: ' : '';
                
                return \`
                    <div class="message \${messageClass}">
                        <div>\${prefix}\${msg.message_text}</div>
                        <div class="message-info">\${timestamp}</div>
                    </div>
                \`;
            }).join('');
            
            // Scroll hacia abajo
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || !currentChat) return;
            
            try {
                const response = await fetch(\`\${API_BASE}/manual-override\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${currentUser.token}\`
                    },
                    body: JSON.stringify({
                        action: 'send_message',
                        whatsapp_id: currentChat.whatsapp_id,
                        message: message
                    })
                });
                
                if (response.ok) {
                    input.value = '';
                    await loadMessages(); // Recargar mensajes
                    await loadChats(); // Actualizar lista de chats
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
        
        async function toggleAI() {
            if (!currentChat) return;
            
            try {
                const response = await fetch(\`\${API_BASE}/manual-override\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${currentUser.token}\`
                    },
                    body: JSON.stringify({
                        action: 'toggle_ai',
                        whatsapp_id: currentChat.whatsapp_id,
                        ai_enabled: !currentChat.ai_enabled
                    })
                });
                
                if (response.ok) {
                    currentChat.ai_enabled = !currentChat.ai_enabled;
                    document.getElementById('toggleAI').textContent = \`IA: \${currentChat.ai_enabled ? 'Habilitada' : 'Deshabilitada'}\`;
                    document.getElementById('toggleAI').className = \`toggle-ai \${currentChat.ai_enabled ? '' : 'disabled'}\`;
                    await loadChats(); // Actualizar lista de chats
                }
            } catch (error) {
                console.error('Error toggling AI:', error);
            }
        }
        
        function logout() {
            localStorage.removeItem('authToken');
            currentUser = null;
            currentChat = null;
            showLogin();
        }
        
        // Auto-refresh cada 30 segundos
        setInterval(() => {
            if (currentUser && currentChat) {
                loadMessages();
            }
        }, 30000);
    </script>
</body>
</html>`

      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        }
      })
    }

    // Si no es una ruta reconocida, devolver 404
    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Error serving web app:', error)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
