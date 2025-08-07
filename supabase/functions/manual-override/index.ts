/**
 * Manual Override Handler
 * Permite a los usuarios activar/desactivar IA y enviar mensajes manuales
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ManualRequestBody {
  action: 'toggle_ai' | 'send_message' | 'get_chats' | 'get_messages';
  whatsapp_id?: string;
  message?: string;
  ai_enabled?: boolean;
  custom_prompt?: string;
  phone_number_id?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendWhatsAppMessage(phoneNumberId: string, to: string, message: string) {
  // Usar la versión más reciente v23.0 según documentación oficial
  const whatsappUrl = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`
  
  const response = await fetch(whatsappUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: message
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Verificación de autenticación con Bearer token
function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    
    try {
      // Decodificar el token simple
      const payload = JSON.parse(atob(token))
      const now = Math.floor(Date.now() / 1000)
      
      // Verificar que el token no haya expirado y sea válido
      if (payload.exp && payload.exp > now && payload.username === Deno.env.get('ADMIN_USERNAME')) {
        return true
      }
    } catch {
      return false
    }
  }

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verificar autenticación
  if (!verifyAuth(req)) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: {
        ...corsHeaders,
        'WWW-Authenticate': 'Basic realm="WhatsApp AI Admin"'
      }
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: ManualRequestBody = await req.json()
    const { action, whatsapp_id, message, ai_enabled, custom_prompt, phone_number_id } = body

    switch (action) {
      case 'get_chats':
        // Obtener lista de chats activos
        const { data: chats } = await supabaseClient
          .from('chat_configurations')
          .select(`
            whatsapp_id,
            contact_name,
            ai_enabled,
            last_activity,
            unread_count,
            ai_prompt
          `)
          .order('last_activity', { ascending: false })

        return new Response(
          JSON.stringify({ success: true, chats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_messages':
        if (!whatsapp_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'whatsapp_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Obtener mensajes del chat
        const { data: messages } = await supabaseClient
          .from('chat_messages')
          .select('*')
          .eq('whatsapp_id', whatsapp_id)
          .order('created_at', { ascending: true })
          .limit(50)

        // Marcar mensajes como leídos
        await supabaseClient
          .from('chat_configurations')
          .update({ unread_count: 0 })
          .eq('whatsapp_id', whatsapp_id)

        return new Response(
          JSON.stringify({ success: true, messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'toggle_ai':
        if (!whatsapp_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'whatsapp_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Activar/desactivar IA para un chat específico
        const { error: toggleError } = await supabaseClient
          .from('chat_configurations')
          .upsert({
            whatsapp_id: whatsapp_id,
            ai_enabled: ai_enabled ?? false,
            ai_prompt: custom_prompt || null,
            last_activity: new Date().toISOString()
          })

        if (toggleError) {
          throw toggleError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `IA ${ai_enabled ? 'activada' : 'desactivada'} para ${whatsapp_id}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'send_message':
        if (!whatsapp_id || !message || !phone_number_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'whatsapp_id, message, and phone_number_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Enviar mensaje manual
        const whatsappResult = await sendWhatsAppMessage(phone_number_id, whatsapp_id, message)

        // Guardar mensaje en la base de datos
        const { error: insertError } = await supabaseClient
          .from('chat_messages')
          .insert({
            whatsapp_id: whatsapp_id,
            message_text: message,
            message_id: whatsappResult.messages?.[0]?.id || `manual_${Date.now()}`,
            direction: 'outgoing',
            phone_number_id: phone_number_id,
            is_ai_generated: false
          })

        if (insertError) {
          console.error('Error saving manual message:', insertError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            whatsapp_message_id: whatsappResult.messages?.[0]?.id,
            message: 'Mensaje enviado exitosamente'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in manual override:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/manual-override' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
