import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET') || ''

serve(async (req) => {
  // 1. Verifique a assinatura do webhook (se o Dodo oferecer um cabeçalho de assinatura)
  // const signature = req.headers.get('dodo-signature')
  
  const payload = await req.json()

  // Conectar com o banco usando service_role para contornar RLS
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // O payload real vai depender da documentação do Dodo Payments
  // Exemplo de como seria se o Dodo Payments enviasse { type: 'payment.success', customer_id: 'cus_123' }
  
  if (payload.type === 'payment.success') {
    // O payload do Dodo Payments geralmente contém o email do cliente ou o ID
    const { customer_id, customer_email } = payload.data
    
    // Tenta atualizar usando o email do cliente (garantido pois enviamos via URL)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    let updateQuery = supabaseAdmin
      .from('users')
      .update({ 
        subscription_status: 'active', 
        dodo_customer_id: customer_id,
        subscription_end_date: thirtyDaysFromNow.toISOString()
      })
      
    if (customer_email) {
      updateQuery = updateQuery.eq('email', customer_email)
    } else {
      updateQuery = updateQuery.eq('dodo_customer_id', customer_id)
    }
    
    const { error } = await updateQuery

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return new Response('Error', { status: 400 })
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } })
})
