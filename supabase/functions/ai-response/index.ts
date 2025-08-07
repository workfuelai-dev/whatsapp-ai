/**
 * AI Response Handler
 * Procesa mensajes usando OpenAI y envía respuestas automáticas via WhatsApp
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface AIRequestBody {
  whatsapp_id: string;
  message: string;
  phone_number_id: string;
  custom_prompt?: string;
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

async function generateAIResponse(message: string, conversationHistory: string[], customPrompt?: string): Promise<string> {
  const systemPrompt = customPrompt || `
Eres un asistente de atención al cliente profesional y amigable. 
Responde de manera clara, concisa y útil. 
Mantén un tono profesional pero cálido.
Si no tienes información específica, sugiere contactar directamente con el equipo.
Responde SIEMPRE en español.
`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: msg
    })),
    { role: 'user', content: message }
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Modelo más económico y rápido
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje en este momento.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: AIRequestBody = await req.json()
    const { whatsapp_id, message, phone_number_id, custom_prompt } = body

    console.log(`Processing AI response for ${whatsapp_id}: ${message}`)

    // Obtener historial de conversación (últimos 10 mensajes)
    const { data: messageHistory } = await supabaseClient
      .from('chat_messages')
      .select('message_text, direction')
      .eq('whatsapp_id', whatsapp_id)
      .order('created_at', { ascending: true })
      .limit(10)

    const conversationHistory = messageHistory?.map(msg => msg.message_text) || []

    // Generar respuesta con IA
    const aiResponse = await generateAIResponse(message, conversationHistory, custom_prompt)

    // Enviar respuesta por WhatsApp
    const whatsappResult = await sendWhatsAppMessage(phone_number_id, whatsapp_id, aiResponse)

    // Guardar respuesta en la base de datos
    const { error: insertError } = await supabaseClient
      .from('chat_messages')
      .insert({
        whatsapp_id: whatsapp_id,
        message_text: aiResponse,
        message_id: whatsappResult.messages?.[0]?.id || `ai_${Date.now()}`,
        direction: 'outgoing',
        phone_number_id: phone_number_id,
        is_ai_generated: true
      })

    if (insertError) {
      console.error('Error saving AI response:', insertError)
    }

    // Actualizar última actividad del chat
    await supabaseClient
      .from('chat_configurations')
      .upsert({
        whatsapp_id: whatsapp_id,
        last_activity: new Date().toISOString(),
        ai_enabled: true
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        ai_response: aiResponse,
        whatsapp_message_id: whatsappResult.messages?.[0]?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in AI response:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-response' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
