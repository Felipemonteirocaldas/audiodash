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

  const { customer_id, customer_email } = payload.data || {}
  
  if (!customer_id && !customer_email) {
    return new Response(JSON.stringify({ received: true, msg: 'No customer info' }), { headers: { "Content-Type": "application/json" } })
  }

  let updateData: any = {}

  switch (payload.type) {
    case 'payment.success':
    case 'subscription.created':
    case 'subscription.renewed': {
      const expirationDate = payload.data?.current_period_end 
        ? new Date(payload.data.current_period_end)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days fallback

      updateData = { 
        subscription_status: 'active', 
        dodo_customer_id: customer_id,
        subscription_end_date: expirationDate.toISOString()
      }
      break;
    }
    case 'subscription.canceled': {
      // Mantém a data de expiração, apenas muda o status para cancelado (o usuário pode usar até expirar)
      updateData = { 
        subscription_status: 'canceled'
      }
      break;
    }
    case 'payment.failed': {
      updateData = { 
        subscription_status: 'past_due'
      }
      break;
    }
    case 'payment.refunded': {
      updateData = { 
        subscription_status: 'inactive'
      }
      break;
    }
    default:
      // Ignore unhandled events
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } })
  }

  let updateQuery = supabaseAdmin
    .from('users')
    .update(updateData)
    
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

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } })
})
