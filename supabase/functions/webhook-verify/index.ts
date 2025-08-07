/**
 * WhatsApp Webhook Complete Handler
 * Función que maneja tanto la verificación como los mensajes de WhatsApp
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface WhatsAppMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verificación del webhook (GET request from WhatsApp)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    console.log('Webhook verification attempt:', { 
      mode, 
      token, 
      challenge,
      expected_token: Deno.env.get('WEBHOOK_VERIFY_TOKEN')
    })

    if (mode === 'subscribe' && token === Deno.env.get('WEBHOOK_VERIFY_TOKEN')) {
      console.log('Webhook verified successfully!')
      return new Response(challenge, { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    } else {
      console.log('Webhook verification failed')
      return new Response('Verification failed', { 
        status: 403,
        headers: corsHeaders
      })
    }
  }

  // Procesar mensajes entrantes (POST request from WhatsApp)
  if (req.method === 'POST') {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const body: WhatsAppMessage = await req.json()
      console.log('Received webhook:', JSON.stringify(body, null, 2))

      // Verificar que es un mensaje válido según documentación oficial
      if (body.object === 'whatsapp_business_account' && body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value) {
                const messages = change.value.messages
                const contacts = change.value.contacts

                // Verificar que existen mensajes
                if (messages && messages.length > 0) {
                  for (const message of messages) {
                    // Procesar solo mensajes de texto según la documentación
                    if (message.type === 'text' && message.text?.body) {
                      // Buscar información de contacto (puede ser opcional)
                      const contact = contacts?.find(c => c.wa_id === message.from)
                      
                      const { error: insertError } = await supabaseClient
                        .from('chat_messages')
                        .insert({
                          whatsapp_id: message.from,
                          contact_name: contact?.profile?.name || 'Usuario',
                          message_text: message.text.body,
                          message_id: message.id,
                          timestamp: message.timestamp,
                          direction: 'incoming',
                          phone_number_id: change.value.metadata?.phone_number_id
                        })

                      if (insertError) {
                        console.error('Error saving message:', insertError)
                        continue
                      }

                      // Verificar si IA está habilitada para este chat
                      const { data: chatConfig } = await supabaseClient
                        .from('chat_configurations')
                        .select('ai_enabled, ai_prompt')
                        .eq('whatsapp_id', message.from)
                        .single()

                      // Si IA está habilitada, llamar a la función de respuesta automática
                      if (chatConfig?.ai_enabled) {
                        const aiResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-response`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            whatsapp_id: message.from,
                            message: message.text.body,
                            phone_number_id: change.value.metadata?.phone_number_id,
                            custom_prompt: chatConfig.ai_prompt
                          })
                        })

                        if (!aiResponse.ok) {
                          console.error('Error calling AI response function:', await aiResponse.text())
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return new Response('OK', { 
        status: 200,
        headers: corsHeaders
      })

    } catch (error) {
      console.error('Error processing webhook:', error)
      return new Response('Internal Server Error', { 
        status: 500,
        headers: corsHeaders
      })
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders
  })
})
