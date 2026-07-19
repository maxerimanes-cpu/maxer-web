// api/mp-preference.js
// Serverless function — el token de MP nunca llega al browser

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const ALLOWED_ORIGIN  = process.env.ALLOWED_ORIGIN || 'https://maxer-web.vercel.app';

export default async function handler(req, res) {
  // CORS — solo acepta pedidos desde tu dominio
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items, payer, back_urls, external_reference } = req.body;

    // Validaciones básicas server-side
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items inválidos' });
    }
    if (!payer || !payer.email) {
      return res.status(400).json({ error: 'Datos del comprador incompletos' });
    }

    // Validar que los precios sean números reales (anti-manipulación)
    for (const item of items) {
      if (typeof item.unit_price !== 'number' || item.unit_price <= 0) {
        return res.status(400).json({ error: 'Precio inválido' });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
      }
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items,
        payer,
        back_urls: {
          success: `${ALLOWED_ORIGIN}/?pago=ok`,
          failure: `${ALLOWED_ORIGIN}/?pago=error`,
          pending: `${ALLOWED_ORIGIN}/?pago=pendiente`
        },
        auto_return: 'approved',
        binary_mode: false,
        statement_descriptor: 'MAXER IMANES',
        external_reference
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP Error:', data);
      return res.status(response.status).json({ error: data.message || 'Error de MercadoPago' });
    }

    return res.status(200).json({ init_point: data.init_point, id: data.id });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
