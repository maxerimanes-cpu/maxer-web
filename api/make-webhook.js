// api/make-webhook.js
// Serverless function — el webhook de Make nunca llega al browser

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const ALLOWED_ORIGIN   = process.env.ALLOWED_ORIGIN || 'https://maxer-web.vercel.app';
const WEBHOOK_SECRET   = process.env.WEBHOOK_SECRET; // token secreto de validación

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Validar token secreto
  const secret = req.headers['x-webhook-secret'];
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    console.warn('Intento de acceso no autorizado al webhook');
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const pedido = req.body;

    // Validaciones básicas
    if (!pedido || !pedido.email || !pedido.nombre) {
      return res.status(400).json({ error: 'Datos del pedido incompletos' });
    }

    // Sanitizar datos antes de enviar a Make
    const payload = {
      fecha:      String(pedido.fecha     || '').slice(0, 50),
      nombre:     String(pedido.nombre    || '').slice(0, 100),
      telefono:   String(pedido.telefono  || '').slice(0, 20),
      email:      String(pedido.email     || '').slice(0, 100),
      direccion:  String(pedido.direccion || '').slice(0, 200),
      comentarios:String(pedido.comentarios || '').slice(0, 500),
      envio:      String(pedido.envio     || '').slice(0, 100),
      items:      String(pedido.items     || '').slice(0, 500),
      total:      String(pedido.total     || '').slice(0, 20),
      descuento:  String(pedido.descuento || '').slice(0, 20),
      canal:      'Web - MercadoPago',
      estado:     String(pedido.estado    || '').slice(0, 50),
      referencia: String(pedido.referencia|| '').slice(0, 100),
    };

    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
