/**
 * Simple Authentication Handler
 * Maneja login/logout básico para la interfaz administrativa
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface AuthRequestBody {
  action: 'login' | 'verify';
  username?: string;
  password?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generar JWT simple (solo para demostración - en producción usar bibliotecas seguras)
function generateSimpleToken(username: string): string {
  const payload = {
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
  }
  
  return btoa(JSON.stringify(payload))
}

function verifyToken(token: string): { valid: boolean; username?: string } {
  try {
    const payload = JSON.parse(atob(token))
    const now = Math.floor(Date.now() / 1000)
    
    if (payload.exp && payload.exp > now) {
      return { valid: true, username: payload.username }
    }
    
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Detectar si es formato directo (username, password) o con action
    let action, username, password
    
    if (body.action) {
      // Formato con action
      ({ action, username, password } = body)
    } else if (body.username && body.password) {
      // Formato directo desde interfaz web
      action = 'login'
      username = body.username
      password = body.password
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'login':
        if (!username || !password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Username and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar credenciales
        const validUsername = Deno.env.get('ADMIN_USERNAME')
        const validPassword = Deno.env.get('ADMIN_PASSWORD')

        if (username === validUsername && password === validPassword) {
          const token = generateSimpleToken(username)
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              token,
              message: 'Login successful',
              username
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'verify':
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(
            JSON.stringify({ success: false, error: 'No token provided' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const token = authHeader.replace('Bearer ', '')
        const verification = verifyToken(token)

        if (verification.valid) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              username: verification.username,
              message: 'Token valid'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid or expired token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in authentication:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/simple-auth' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
