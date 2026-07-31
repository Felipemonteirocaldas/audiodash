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
    const { customer_id } = payload.data
    
    // Atualiza o usuário no banco de dados
    const { error } = await supabaseAdmin
      .from('users')
      .update({ subscription_status: 'active' })
      .eq('dodo_customer_id', customer_id)

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return new Response('Error', { status: 400 })
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } })
})
