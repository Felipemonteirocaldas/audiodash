import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Webhook do Dodo Payments (padrão Standard Webhooks).
 * - Verifica a assinatura: HMAC-SHA256 de "{webhook-id}.{webhook-timestamp}.{corpo bruto}" com o segredo
 *   (prefixo "whsec_" removido e base64 decodificado), comparada com cada valor "v1,<base64>" do cabeçalho webhook-signature.
 * - Rejeita timestamps com mais de 5 minutos de diferença.
 * - Usa os nomes de evento documentados (payment.succeeded, subscription.active, subscription.cancelled etc.).
 * Sem DODO_WEBHOOK_SECRET configurado, nenhuma requisição é aceita.
 */
const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET') || ''
const TOLERANCE_SECONDS = 5 * 60

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifySignature(rawBody: string, headers: Headers): Promise<boolean> {
  const id = headers.get('webhook-id'), timestamp = headers.get('webhook-timestamp'), signatureHeader = headers.get('webhook-signature')
  if (!DODO_WEBHOOK_SECRET || !id || !timestamp || !signatureHeader) return false
  const sent = Number(timestamp)
  if (!Number.isFinite(sent) || Math.abs(Date.now() / 1000 - sent) > TOLERANCE_SECONDS) return false
  const secret = DODO_WEBHOOK_SECRET.startsWith('whsec_') ? DODO_WEBHOOK_SECRET.slice(6) : DODO_WEBHOOK_SECRET
  const key = await crypto.subtle.importKey('raw', base64ToBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)))
  const expected = btoa(String.fromCharCode(...mac))
  return signatureHeader.split(' ').some(part => {
    const [version, signature] = part.split(',')
    return version === 'v1' && !!signature && timingSafeEqual(signature, expected)
  })
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const rawBody = await req.text()
  if (!await verifySignature(rawBody, req.headers)) return json({ error: 'invalid signature' }, 401)

  let payload: any
  try { payload = JSON.parse(rawBody) } catch { return json({ error: 'invalid json' }, 400) }

  const data = payload?.data || {}
  const customerId = data.customer?.customer_id ?? data.customer_id
  const customerEmail = (data.customer?.email ?? data.customer_email ?? '').toLowerCase() || undefined
  if (!customerId && !customerEmail) return json({ received: true, msg: 'No customer info' })

  const periodEnd = data.next_billing_date ?? data.expires_at ?? data.current_period_end
  const endDate = (fallbackDays: number) => (periodEnd ? new Date(periodEnd) : new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000)).toISOString()

  let updateData: Record<string, unknown>
  switch (payload.type) {
    case 'subscription.active':
    case 'subscription.renewed':
    case 'subscription.plan_changed':
    case 'subscription.unpaused':
      updateData = { subscription_status: 'active', dodo_customer_id: customerId, subscription_end_date: endDate(30) }
      break
    case 'payment.succeeded':
      // Pagamentos de assinatura são tratados pelos eventos subscription.*; aqui só pagamentos avulsos.
      if (data.subscription_id) return json({ received: true })
      updateData = { subscription_status: 'active', dodo_customer_id: customerId, subscription_end_date: endDate(30) }
      break
    case 'subscription.cancelled':
      // Mantém a data de expiração: o usuário usa até o fim do período pago.
      updateData = { subscription_status: 'canceled' }
      break
    case 'subscription.on_hold':
    case 'subscription.past_due':
    case 'subscription.failed':
    case 'payment.failed':
      updateData = { subscription_status: 'past_due' }
      break
    case 'subscription.expired':
    case 'subscription.paused':
    case 'refund.succeeded':
      updateData = { subscription_status: 'inactive' }
      break
    default:
      return json({ received: true })
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  let updateQuery = supabaseAdmin.from('users').update(updateData)
  // ilike sem curingas: "_" e "%" do e-mail são escapados para não casar outro endereço.
  updateQuery = customerEmail ? updateQuery.ilike('email', customerEmail.replace(/[\\%_]/g, '\\$&')) : updateQuery.eq('dodo_customer_id', customerId)
  const { error } = await updateQuery

  if (error) {
    console.error('Erro ao atualizar usuário:', error)
    return json({ error: 'update failed' }, 500)
  }
  return json({ received: true })
})
