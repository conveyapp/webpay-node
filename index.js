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
    res.send(`
  <html>
    <head><meta charset="utf-8" /><title>Oneclick Demo</title></head>
    <body style="font-family:sans-serif;text-align:center;padding-top:50px;">
      <h2>Oneclick (inscripción de tarjeta)</h2>
      <form action="/inscribe" method="POST">
        <label>Usuario:</label><br>
        <input name="username" required><br><br>
        <label>Correo:</label><br>
        <input name="email" type="email" required><br><br>
        <button type="submit">Inscribir tarjeta</button>
      </form>
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
