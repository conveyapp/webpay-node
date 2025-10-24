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
        </div>
      </div>
      <script>
        (function(){
          var hasParams = ${hasParams ? 'true' : 'false'};
          if (hasParams) {
            var u = document.getElementById('username');
            var e = document.getElementById('email');
            if (u && e && u.value && e.value) {
              document.getElementById('f').submit();
            }
          }
        })();
      </script>
    </body>
  </html>
  `);
});

// 🚀 Inicia inscripción
app.post("/inscribe", async (req, res) => {
  const { username, email } = req.body;
  const responseUrl = "http://localhost:3000/finish_inscription";

  try {
    const start = await ins.start(username, email, responseUrl);
    console.log("✅ Inicio inscripción:", start);

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
app.post("/finish_inscription", async (req, res) => {
  const token = req.body.TBK_TOKEN;
  if (!token) return res.send("Falta token de inscripción");

  try {
    const result = await ins.finish(token);
    console.log("✅ Resultado inscripción:", result);

    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h2>✅ Inscripción completada</h2>
        <p><b>username:</b> ${result.username}</p>
        <p><b>tbk_user:</b> ${result.tbk_user}</p>
        <form action="/charge" method="POST">
          <input type="hidden" name="username" value="${result.username}" />
          <input type="hidden" name="tbk_user" value="${result.tbk_user}" />
          <label>Monto:</label>
          <input name="amount" type="number" value="1000" required />
          <button type="submit">Cobrar</button>
        </form>
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
