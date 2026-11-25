// api/resend-webhook.js
export default async function handler(req, res) {
  // 1. Solo aceptar peticiones POST de Resend
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // 2. Verificar que sea un evento de correo entrante
    if (!payload || payload.type !== 'email.received' || !payload.data) {
      return res.status(200).json({ ignored: true, reason: 'Evento no relevante' });
    }

    // 3. Filtrar exclusivamente por facturas@gi-mo-sicesa.com.ar
    // (Revisa tanto 'to' como 'received_for' por si hay reenvíos o alias)
    const destinatarios = [
      ...(Array.isArray(payload.data.to) ? payload.data.to : [payload.data.to]),
      ...(Array.isArray(payload.data.received_for) ? payload.data.received_for : [])
    ]
      .filter(Boolean)
      .map((email) => String(email).toLowerCase());

    const esParaFacturasGimo = destinatarios.some((email) =>
      email.includes('facturas@gi-mo-sicesa.com.ar')
    );

    if (!esParaFacturasGimo) {
      console.log('Mail ignorado (pertenece a otra app):', destinatarios);
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Destinatario de otra aplicación',
      });
    }

    // 4. Construir la URL de Google Apps Script con el token secreto
    const appsScriptUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!appsScriptUrl || !webhookSecret) {
      console.error('Faltan variables APPS_SCRIPT_WEBHOOK_URL o WEBHOOK_SECRET en Vercel');
      return res.status(500).json({ error: 'Configuración incompleta en el servidor' });
    }

    const targetUrl = `${appsScriptUrl}?token=${encodeURIComponent(webhookSecret)}`;

    // 5. Reenviar a Apps Script siguiendo la redirección 302 de Google
    const gasResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Resuelve el 302 - Moved Temporarily automáticamente
    });

    const responseText = await gasResponse.text();
    let gasData;
    try {
      gasData = JSON.parse(responseText);
    } catch {
      gasData = { rawResponse: responseText.substring(0, 300) };
    }

    // 6. Responder 200 OK a Resend para evitar los 3 reintentos
    return res.status(200).json({
      success: true,
      forwarded: true,
      appsScriptStatus: gasResponse.status,
      appsScriptResult: gasData,
    });
  } catch (error) {
    console.error('Error en proxy resend-webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno en el proxy',
    });
  }
}