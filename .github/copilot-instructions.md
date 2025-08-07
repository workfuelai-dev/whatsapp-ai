<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/guides/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# WhatsApp AI - Instrucciones para GitHub Copilot

## Contexto del Proyecto

Esta es una aplicación empresarial interna para gestionar comunicación con clientes via WhatsApp Business API v23, con funciones de inteligencia artificial integradas. Permite que agentes de IA respondan automáticamente a los clientes y que los operadores humanos puedan tomar control manual cuando sea necesario.

## Arquitectura Técnica

### Backend - Supabase Edge Functions (Deno + TypeScript)
- **Runtime:** Deno (no Node.js) - para Edge Functions de Supabase
- **Lenguaje:** TypeScript exclusivamente
- **Despliegue:** Supabase Cloud (no local)
- **Base de datos:** PostgreSQL (Supabase)

### Frontend - Vanilla JavaScript
- **Stack:** HTML5 + CSS3 + JavaScript vanilla (sin frameworks)
- **Diseño:** Interfaz tipo WhatsApp Web responsiva
- **Autenticación:** Sistema básico usuario/contraseña (no Supabase Auth)

### APIs Integradas
- **WhatsApp Business API v23** (Meta Graph API)
- **OpenAI API** (gpt-4o-mini para respuestas de IA)
- **Supabase** (Edge Functions + PostgreSQL)

## Estructura de Archivos

```
whatsapp-ai/
├── supabase/
│   ├── functions/              # Edge Functions (TypeScript/Deno)
│   │   ├── whatsapp-webhook/   # Recibe mensajes de WhatsApp
│   │   ├── ai-response/        # Procesa respuestas con IA
│   │   ├── manual-override/    # Control manual de chats
│   │   └── simple-auth/        # Autenticación básica
│   └── migrations/             # Esquemas de base de datos
├── web/                        # Interfaz de usuario
│   ├── index.html             # Aplicación principal
│   └── app.js                 # Lógica del frontend
├── .env.example               # Variables de entorno
└── .github/
    └── copilot-instructions.md
```

## Funcionalidades Principales

### 1. Webhook de WhatsApp
- Recibe mensajes entrantes de WhatsApp Business API v23
- Almacena mensajes en base de datos
- Decide si activar respuesta automática de IA

### 2. Sistema de IA
- Utiliza OpenAI GPT-4o-mini para generar respuestas
- Contexto de conversación (historial de mensajes)
- Prompts personalizables por chat
- Control de activación/desactivación por conversación

### 3. Control Manual
- Interfaz web para gestionar chats
- Toggle IA ON/OFF por conversación individual
- Envío de mensajes manuales
- Vista de historial completo de conversaciones

### 4. Autenticación Simple
- Sistema básico usuario/contraseña
- Tokens JWT simples (no Supabase Auth)
- Ideal para herramienta empresarial interna

## Base de Datos (PostgreSQL)

### Tablas Principales
```sql
chat_messages:
- id, whatsapp_id, contact_name, message_text
- direction (incoming/outgoing), is_ai_generated
- timestamps, phone_number_id

chat_configurations:
- whatsapp_id, ai_enabled, ai_prompt
- last_activity, unread_count
```

## Guías de Desarrollo

### Al trabajar con Edge Functions:
- Usar import syntax de Deno: `import { } from 'jsr:@supabase/supabase-js@2'`
- No usar npm packages, solo módulos compatibles con Deno
- Manejar CORS headers correctamente
- Usar variables de entorno con `Deno.env.get()`

### Al trabajar con WhatsApp API:
- Usar Graph API v23.0 directamente (no SDK oficial archivado)
- Manejar webhooks GET (verificación) y POST (mensajes)
- Estructura de mensajes según documentación oficial de Meta
- Rate limiting y manejo de errores

### Al trabajar con la interfaz:
- Diseño similar a WhatsApp Web
- Funcionalidad responsive
- Polling para actualizaciones en tiempo real
- Estado de conectividad y errores

## Variables de Entorno Críticas

```bash
# Autenticación
ADMIN_USERNAME / ADMIN_PASSWORD

# WhatsApp API v23
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WEBHOOK_VERIFY_TOKEN

# OpenAI
OPENAI_API_KEY

# Supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Comandos Importantes

```bash
# Desarrollo local
supabase start

# Desplegar funciones
supabase functions deploy

# Desplegar función específica
supabase functions deploy whatsapp-webhook
```

## Consideraciones de Seguridad

- Verificación de tokens webhook de WhatsApp
- Validación de autenticación en todas las Edge Functions
- Sanitización de inputs para evitar XSS
- Rate limiting en endpoints públicos
- Variables de entorno nunca en código

## Instrucciones Específicas para Copilot

1. **Siempre usar TypeScript en Edge Functions** con sintaxis de Deno
2. **Graph API v23.0** para WhatsApp (no SDKs obsoletos)
3. **No sugerir Node.js packages** - solo módulos Deno compatibles
4. **Mantener consistencia** con el diseño tipo WhatsApp Web
5. **Priorizar seguridad** y validación de datos
6. **Código limpio** y bien documentado para mantenimiento futuro

## Estado Actual del Proyecto

✅ Estructura básica creada
✅ Edge Functions implementadas
✅ Esquema de base de datos definido
✅ Interfaz web funcional
🔄 Pendiente: Configuración de proyecto Supabase real
🔄 Pendiente: Configuración de WhatsApp Business API
🔄 Pendiente: Testing y deployment

Este proyecto está listo para configuración final y deployment una vez se obtengan las credenciales de Supabase, WhatsApp Business API, y OpenAI.
