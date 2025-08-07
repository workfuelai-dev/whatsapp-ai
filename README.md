# 🤖 WhatsApp AI - Sistema de Comunicación Empresarial

Una aplicación completa para gestionar comunicación con clientes via WhatsApp Business API v23, con inteligencia artificial integrada y control manual.

## 🚀 Características Principales

- **💬 WhatsApp Business API v23** - Integración directa con la API más reciente de Meta
- **🤖 IA Integrada** - Respuestas automáticas usando OpenAI GPT-4o-mini
- **👨‍💼 Control Manual** - Activar/desactivar IA por conversación y responder manualmente
- **☁️ Supabase Cloud** - Backend completamente en la nube con Edge Functions
- **📱 Interfaz Web** - Panel de control tipo WhatsApp Web responsive
- **🔒 Seguro** - Autenticación básica para uso empresarial interno

## 🏗️ Arquitectura

```
Cliente WhatsApp → WhatsApp API → Supabase Edge Functions → OpenAI API
                                        ↓
                    Base de Datos PostgreSQL ← Interfaz Web
```

### Tecnologías Utilizadas

- **Backend:** Supabase Edge Functions (Deno + TypeScript)
- **Base de Datos:** PostgreSQL (Supabase)
- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **APIs:** WhatsApp Business API v23, OpenAI API
- **Despliegue:** Supabase Cloud

## 📋 Requisitos Previos

### 1. Cuenta de Supabase
- Crear cuenta gratuita en [supabase.com](https://supabase.com)
- Crear nuevo proyecto
- Obtener URL del proyecto y API keys

### 2. WhatsApp Business API
- Cuenta de desarrollador en [Meta for Developers](https://developers.facebook.com)
- Aplicación configurada con WhatsApp Business API
- Número de teléfono verificado
- Access Token permanente

### 3. OpenAI API
- Cuenta en [OpenAI Platform](https://platform.openai.com)
- API Key con créditos disponibles

### 4. Herramientas de Desarrollo
- Node.js (para Supabase CLI)
- Git
- VS Code (recomendado)

## 🛠️ Instalación y Configuración

### Paso 1: Clonar y Configurar Proyecto Local

```bash
# Si descargaste el proyecto, navega a la carpeta
cd whatsapp-ai

# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Verificar instalación
supabase --version
```

### Paso 2: Configurar Supabase Cloud

1. **Crear proyecto en Supabase:**
   - Ve a [database.new](https://database.new)
   - Crea nuevo proyecto
   - Espera a que se complete la configuración

2. **Obtener credenciales:**
   - Ve a Settings → API
   - Copia la URL del proyecto
   - Copia las API keys (anon y service_role)

3. **Conectar proyecto local:**
   ```bash
   supabase login
   supabase projects list
   supabase link --project-ref TU_PROJECT_ID
   ```

### Paso 3: Configurar Base de Datos

1. **Ejecutar migraciones:**
   - Ve a Supabase Dashboard → SQL Editor
   - Abre el archivo `supabase/migrations/20250807_initial_schema.sql`
   - Copia y ejecuta el SQL completo

### Paso 4: Configurar Variables de Entorno

1. **En Supabase Dashboard → Settings → Edge Functions:**
   ```bash
   # Autenticación
   ADMIN_USERNAME=tu_usuario
   ADMIN_PASSWORD=tu_password_seguro

   # WhatsApp API v23
   WHATSAPP_ACCESS_TOKEN=tu_access_token
   WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id
   WEBHOOK_VERIFY_TOKEN=tu_token_webhook_secreto

   # OpenAI
   OPENAI_API_KEY=sk-tu_openai_api_key

   # Supabase (se configuran automáticamente)
   SUPABASE_URL=https://tu-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

### Paso 5: Desplegar Edge Functions

```bash
# Desplegar todas las funciones
supabase functions deploy

# O desplegar individualmente
supabase functions deploy whatsapp-webhook
supabase functions deploy ai-response
supabase functions deploy manual-override
supabase functions deploy simple-auth
```

### Paso 6: Configurar WhatsApp Webhook

1. **En Meta for Developers:**
   - Ve a tu aplicación → WhatsApp → Configuration
   - En Webhooks, añade:
     - **URL:** `https://tu-project-id.supabase.co/functions/v1/whatsapp-webhook`
     - **Verify Token:** El mismo que configuraste en `WEBHOOK_VERIFY_TOKEN`
   - Subscribe a: `messages`

### Paso 7: Configurar Interfaz Web

1. **Editar `web/app.js`:**
   ```javascript
   this.baseUrl = 'https://tu-project-id.supabase.co';
   ```

2. **Servir interfaz:**
   ```bash
   # Opción 1: Servidor simple con Python
   cd web
   python -m http.server 8000

   # Opción 2: Usar Live Server en VS Code
   # Instalar extensión Live Server y hacer clic derecho → "Open with Live Server"
   ```

## 🎯 Uso de la Aplicación

### 1. Acceso Inicial
- Abre la interfaz web en `http://localhost:8000`
- Inicia sesión con las credenciales configuradas

### 2. Gestión de Chats
- **Ver conversaciones:** Lista automática de chats activos
- **Seleccionar chat:** Click en conversación para ver mensajes
- **Toggle IA:** Activar/desactivar respuestas automáticas por chat
- **Respuesta manual:** Escribir y enviar mensajes directamente

### 3. Configuración de IA
- **Prompts personalizados:** Configurar respuestas específicas por tipo de cliente
- **Historial contextual:** La IA mantiene contexto de conversaciones anteriores
- **Control granular:** Activar/desactivar IA por conversación individual

## 🔧 Desarrollo y Personalización

### Estructura de Archivos

```
whatsapp-ai/
├── supabase/
│   ├── functions/
│   │   ├── whatsapp-webhook/     # Maneja mensajes entrantes
│   │   ├── ai-response/          # Genera respuestas de IA
│   │   ├── manual-override/      # Control manual de chats
│   │   └── simple-auth/          # Autenticación básica
│   └── migrations/               # Esquemas de base de datos
├── web/
│   ├── index.html               # Interfaz principal
│   └── app.js                   # Lógica del frontend
├── .env.example                 # Plantilla de variables
├── .github/
│   └── copilot-instructions.md  # Contexto para GitHub Copilot
└── README.md
```

### Comandos de Desarrollo

```bash
# Desarrollo local con Supabase
supabase start

# Logs de Edge Functions
supabase functions logs --follow

# Desplegar cambios
supabase functions deploy nombre-funcion

# Reiniciar servicios locales
supabase stop && supabase start
```

### Personalización de IA

Edita `supabase/functions/ai-response/index.ts` para:
- Cambiar modelo de OpenAI
- Modificar prompts del sistema
- Ajustar parámetros de respuesta
- Añadir validaciones específicas

## 🚨 Solución de Problemas

### Error: "Webhook verification failed"
- Verifica que `WEBHOOK_VERIFY_TOKEN` sea idéntico en Supabase y Meta
- Asegúrate de que la URL del webhook sea correcta

### Error: "OpenAI API error"
- Verifica que tu API key sea válida
- Confirma que tienes créditos disponibles
- Revisa rate limits de OpenAI

### Error: "WhatsApp API error"
- Confirma que tu Access Token no haya expirado
- Verifica permisos en Meta for Developers
- Revisa que el número de teléfono esté activo

### Error: "Supabase connection failed"
- Verifica las variables de entorno
- Confirma que el proyecto esté activo
- Revisa los logs en Supabase Dashboard

## 📊 Monitoreo y Logs

### Supabase Dashboard
- **Logs:** Functions → [nombre-función] → Logs
- **Base de datos:** Database → Tables
- **Métricas:** Overview → Usage

### Meta for Developers
- **Webhooks:** WhatsApp → Configuration → Webhooks
- **Logs:** WhatsApp → Tools → App Dashboard

## 🔒 Seguridad y Mejores Prácticas

### Variables de Entorno
- ✅ Nunca subir `.env` al código
- ✅ Usar valores únicos y seguros
- ✅ Rotar tokens periódicamente

### Autenticación
- ✅ Cambiar usuario/contraseña por defecto
- ✅ Usar contraseñas fuertes
- ✅ Implementar rate limiting si es necesario

### WhatsApp API
- ✅ Validar todos los webhooks entrantes
- ✅ Manejar rate limits apropiadamente
- ✅ Implementar retry logic para errores

## 📈 Roadmap y Extensiones

### Funcionalidades Futuras
- [ ] Dashboard con métricas y analytics
- [ ] Integración con CRM externo
- [ ] Respuestas con plantillas de WhatsApp
- [ ] Soporte para multimedia (imágenes, documentos)
- [ ] Sistema de etiquetas y categorización
- [ ] Integración con más modelos de IA
- [ ] API REST para integraciones externas

### Optimizaciones
- [ ] Cache de respuestas frecuentes
- [ ] Mejoras de performance en la interfaz
- [ ] Notificaciones push
- [ ] Backup automático de conversaciones

## 🆘 Soporte

Para problemas técnicos:
1. Revisa la sección de solución de problemas
2. Consulta los logs en Supabase Dashboard
3. Verifica la configuración en Meta for Developers
4. Revisa la documentación oficial de cada API

## 📄 Licencia

Este proyecto es para uso empresarial interno. Asegúrate de cumplir con:
- Términos de servicio de WhatsApp Business API
- Políticas de uso de OpenAI
- Términos de servicio de Supabase

---

**¡Tu sistema WhatsApp AI está listo para revolucionar la comunicación con tus clientes! 🚀**
