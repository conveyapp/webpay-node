// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pkg from "transbank-sdk";

const { Oneclick, IntegrationCommerceCodes, IntegrationApiKeys } = pkg;

dotenv.config();
const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Configurar Oneclick Mall (modo integración)
const ins = Oneclick.MallInscription.buildForIntegration(
  IntegrationCommerceCodes.ONECLICK_MALL, // código de integración
  IntegrationApiKeys.WEBPAY               // API Key de integración
);

const tx = Oneclick.MallTransaction.buildForIntegration(
  IntegrationCommerceCodes.ONECLICK_MALL,
  IntegrationApiKeys.WEBPAY
);

// Mapa en memoria para asociar TBK_TOKEN a { email, username }
const pendingInscriptions = new Map();

// 🌐 Home: muestra formulario de inscripción
app.get("/", (req, res) => {
  const { username = "", email = "" } = req.query || {};
  const hasParams = Boolean(username && email);

  res.send(`
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Convey On • Oneclick</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        :root {
          --green: #07E607;
          --mint: #34EBBA;
          --bg: #f8f9fa;
          --card: #ffffff;
          --text: #262626;
          --muted: #666666;
        }
        * { box-sizing: border-box; }
        html, body { height: 100%; }
        body {
          margin: 0;
          font-family: 'Poppins', Arial, sans-serif;
          background: linear-gradient(135deg, var(--green), var(--mint));
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          width: 100%;
          max-width: 560px;
          background: var(--card);
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.12);
          overflow: hidden;
        }
        .header {
          padding: 28px 28px 16px 28px;
          border-bottom: 1px solid #f0f0f0;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        .brand-logo {
          width: 40px; height: 40px; border-radius: 8px; background: #E6FEEB; display:flex; align-items:center; justify-content:center; color: var(--green); font-weight:700;
        }
        h1 { font-size: 22px; margin: 0; color: var(--text); font-weight: 700; }
        p.sub { margin: 6px 0 0 0; color: var(--muted); font-size: 14px; }
        .content { padding: 24px 28px 28px 28px; }
        label { display:block; font-weight:600; font-size:14px; color: var(--text); margin-bottom:8px; }
        input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #E0E0E0;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
        }
        .field { margin-bottom: 16px; }
        .actions { display:flex; gap:12px; align-items:center; margin-top:12px; }
        .btn {
          appearance: none;
          border: none;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-primary {
          background: linear-gradient(90deg, #E6F14B, #C3FE70);
          color: #000;
        }
        .hint { color:#888; font-size:12px; }
        .badge { display:inline-block; padding:6px 10px; background:#F5FFF8; color:#0A8F2E; border:1px solid #DFF6E8; border-radius:999px; font-size:12px; font-weight:600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="brand">
            <div class="brand-logo">C</div>
            <div>
              <h1>Inscripción Oneclick</h1>
              <p class="sub">Vincula tu tarjeta para pagos rápidos en Convey On</p>
            </div>
          </div>
        </div>
        <div class="content">
          ${hasParams ? `
          <div>
            <p class="sub" style="margin-bottom:12px;color:#444;">Vamos a iniciar tu inscripción con Transbank.</p>
            <p class="sub" style="margin:0 0 16px 0;color:#666;">Cuando estés listo, presiona “Seguir” para continuar.</p>
            <div class="actions">
              <button class="btn btn-primary" type="button" onclick="document.getElementById('f').submit()">Seguir</button>
              <span class="hint">Ambiente de integración • <span class="badge">Transbank</span></span>
            </div>
          </div>
          <form id="f" action="/inscribe" method="POST" style="display:none;">
            <input id="username" name="username" value="${String(username || "").replace(/"/g, '&quot;')}" />
            <input id="email" name="email" type="email" value="${String(email || "").replace(/"/g, '&quot;')}" />
          </form>
          ` : `
          <form id="f" action="/inscribe" method="POST">
            <div class="field">
              <label>Usuario</label>
              <input id="username" name="username" value="${String(username || "").replace(/"/g, '&quot;')}" required />
            </div>
            <div class="field">
              <label>Correo</label>
              <input id="email" name="email" type="email" value="${String(email || "").replace(/"/g, '&quot;')}" required />
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit">Inscribir tarjeta</button>
              <span class="hint">Ambiente de integración • <span class="badge">Transbank</span></span>
            </div>
          </form>
          `}
        </div>
      </div>
      <script>
        // En este modo, no hay autoenvío; el usuario presiona “Seguir”.
      </script>
    </body>
  </html>
  `);
});

// 🚀 Inicia inscripción
app.post("/inscribe", async (req, res) => {
  const { username, email } = req.body;
  const responseUrl = "https://webpay-node.onrender.com/finish_inscription";

  try {
    const start = await ins.start(username, email, responseUrl);
    console.log("✅ Inicio inscripción:", start);

    // Guardar asociación token -> datos del usuario para recuperar el email en finish
    try {
      if (start && start.token) {
        pendingInscriptions.set(start.token, { email, username, createdAt: Date.now() });
      }
    } catch (_) { }

    // Redirige a Webpay (inscripción)
    res.send(`
      <html><body>
        <p>Redirigiendo a Webpay Oneclick...</p>
        <form id="f" method="POST" action="${start.url_webpay}">
          <input type="hidden" name="TBK_TOKEN" value="${start.token}" />
        </form>
        <script>document.getElementById('f').submit();</script>
      </body></html>
    `);
  } catch (err) {
    console.error("❌ Error iniciando inscripción:", err);
    res.status(500).send("Error iniciando inscripción");
  }
});

// 🔁 Webpay vuelve acá después de inscripción
app.all("/finish_inscription", async (req, res) => {
  const token = (req.body && (req.body.TBK_TOKEN || req.body.token_ws || req.body.token))
    || (req.query && (req.query.TBK_TOKEN || req.query.token_ws || req.query.token));
  if (!token) return res.send("Falta token de inscripción");

  try {
    const result = await ins.finish(token);
    console.log("✅ Resultado inscripción:", result);

    // Intentar persistir en backend PHP (sin token de seguridad, como solicitado)
    try {
      const pending = pendingInscriptions.get(token) || {};
      const emailFromMap = pending.email || '';
      const usernameFromMap = pending.username || result.username || '';
      // Limpieza básica: eliminar del mapa para no crecer memoria
      pendingInscriptions.delete(token);

      // Extraer marca y últimos 4 dígitos si están disponibles
      const cardType = (result && (result.card_type || (result.card_detail && result.card_detail.card_type))) || null;
      const rawCardNumber = (result && (result.card_number || (result.card_detail && result.card_detail.card_number))) || '';
      const last4Match = (rawCardNumber && rawCardNumber.match(/(\d{4})$/)) || null;
      const cardLast4 = last4Match ? last4Match[1] : null;

      const fetchRes = await fetch("https://convey.cl/cliente/oneclick/OneclickGuardarInscripcion.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailFromMap,
          username: usernameFromMap,
          tbk_user: result.tbk_user || '',
          status: 'SUCCESS',
          environment: 'integration',
          card_brand: cardType,
          card_last4: cardLast4
        })
      });
      const saveJson = await fetchRes.text();
      console.log('📦 Respuesta guardado PHP:', saveJson);
      // Página de confirmación con estilo ConveyOn
      res.send(`
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Convey On • Oneclick</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
            <style>
              :root { --green:#07E607; --mint:#34EBBA; --card:#ffffff; --text:#262626; --muted:#666; }
              *{box-sizing:border-box} html,body{height:100%}
              body{margin:0;font-family:'Poppins',Arial,sans-serif;background:linear-gradient(135deg,var(--green),var(--mint));display:flex;align-items:center;justify-content:center;padding:24px}
              .card{width:100%;max-width:560px;background:var(--card);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.12);overflow:hidden}
              .header{padding:28px 28px 12px 28px;border-bottom:1px solid #f0f0f0}
              .brand{display:flex;align-items:center;gap:12px}
              .brand-logo{width:40px;height:40px;border-radius:8px;background:#E6FEEB;display:flex;align-items:center;justify-content:center;color:var(--green);font-weight:700}
              h1{font-size:22px;margin:0;color:var(--text);font-weight:700}
              .content{padding:24px 28px 28px 28px}
              .ok{display:flex;align-items:center;gap:10px;color:#0A8F2E;font-weight:700;margin-bottom:8px}
              .kv{margin:8px 0;color:var(--muted);font-size:14px}
              .kv b{color:var(--text)}
              .actions{display:flex;gap:12px;align-items:center;margin-top:16px}
              .btn{appearance:none;border:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer}
              .btn-primary{background:linear-gradient(90deg,#E6F14B,#C3FE70);color:#000}
              .hint{color:#888;font-size:12px}
              .badge{display:inline-block;padding:6px 10px;background:#F5FFF8;color:#0A8F2E;border:1px solid #DFF6E8;border-radius:999px;font-size:12px;font-weight:600}
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div class="brand">
                  <div class="brand-logo">C</div>
                  <div><h1>Inscripción Oneclick</h1></div>
                </div>
              </div>
              <div class="content">
                <div class="ok">✅ Inscripción completada</div>
                <div class="kv"><b>Usuario:</b> ${usernameFromMap || '—'}</div>
                <div class="kv"><b>Correo:</b> ${emailFromMap || '—'}</div>
                <div class="kv"><b>tbk_user:</b> ${result.tbk_user || '—'}</div>
                <div class="kv"><b>Tarjeta:</b> ${(cardType || '—')} •••• ${(cardLast4 || '—')}</div>
                <div class="actions">
                  <a href="conveyon://oneclick?status=ok" class="btn btn-primary" style="text-decoration:none;display:inline-block;">Volver a la app</a>
                  <span class="hint">Ambiente de integración • <span class="badge">Transbank</span></span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      return;
    } catch (e) {
      console.error('❌ Error enviando a PHP:', e.message);
    }
    // Fallback de confirmación simple (por si falla el render estilizado)
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h2>✅ Inscripción completada</h2>
        <p><b>username:</b> ${result.username}</p>
        <p><b>tbk_user:</b> ${result.tbk_user}</p>
        <a href="/">Volver al inicio</a>
      </body></html>
    `);
  } catch (err) {
    console.error("❌ Error finalizando inscripción:", err);
    res.status(500).send("Error finalizando inscripción");
  }
});

// 💳 Cobrar (cargo Oneclick)
app.post("/charge", async (req, res) => {
  const { username, tbk_user, amount } = req.body;
  const buyOrder = "order-" + Date.now();

  try {
    const result = await tx.authorize(username, tbk_user, buyOrder, [
      {
        commerce_code: IntegrationCommerceCodes.ONECLICK_MALL_CHILD1,
        buy_order: "child-" + Date.now(),
        amount: Number(amount),
        installments_number: 1,
      },
    ]);

    console.log("✅ Cobro exitoso:", result);

    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h1>✅ Cobro realizado</h1>
        <p>buy_order: ${result.details[0].buy_order}</p>
        <p>status: ${result.details[0].status}</p>
        <p>authorization_code: ${result.details[0].authorization_code}</p>
        <a href="/">Volver al inicio</a>
      </body></html>
    `);
  } catch (err) {
    console.error("❌ Error cobrando:", err);
    res.status(500).send("Error realizando cobro");
  }
});

// 🔙 Reversa de cobro (opcional)
app.post("/reverse", async (req, res) => {
  const { buy_order, commerce_code, authorization_code } = req.body;
  try {
    const reversed = await tx.refund(buy_order, commerce_code, authorization_code, 1000);
    res.json(reversed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor Oneclick corriendo en puerto ${PORT}`));
