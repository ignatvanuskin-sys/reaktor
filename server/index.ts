import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "32kb" }));

  // Booking endpoint: validates, logs, forwards to Telegram if configured.
  // Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env to notify the admin.
  app.post("/api/booking", async (req, res) => {
    const b = req.body ?? {};
    const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const booking = {
      brand: text(b.brand),
      model: text(b.model),
      year: text(b.year).slice(0, 4),
      date: text(b.date),
      time: text(b.time),
      name: text(b.name),
      phone: text(b.phone),
      service: text(b.service),
      problem: text(b.problem).slice(0, 1000),
      channel: text(b.channel) || "Звонок",
      telegram: text(b.telegram),
      consent: b.consent === true,
    };
    if (!booking.brand || !booking.model || !booking.service) {
      res.status(400).json({ ok: false, error: "Заполните авто и услугу." });
      return;
    }
    if (!booking.name || booking.phone.replace(/\D/g, "").length !== 11 || !booking.consent) {
      res.status(400).json({ ok: false, error: "Укажите имя, телефон и согласие на обработку данных." });
      return;
    }
    const message = [
      "Новая заявка с сайта",
      `Авто: ${booking.brand} ${booking.model}${booking.year ? ` (${booking.year})` : ""}`,
      `Услуга: ${booking.service}`,
      booking.date || booking.time ? `Когда: ${[booking.date, booking.time].filter(Boolean).join(" · ")}` : "",
      `Клиент: ${booking.name} · ${booking.phone}`,
      `Связь: ${booking.channel}${booking.telegram ? ` (${booking.telegram})` : ""}`,
      booking.problem ? `Проблема: ${booking.problem}` : "",
    ].filter(Boolean).join("\n");
    console.log(`[booking] ${message.replace(/\n/g, " | ")}`);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      try {
        const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message }),
          signal: AbortSignal.timeout(8000),
        });
        if (!tg.ok) console.error(`[booking] telegram forward failed: HTTP ${tg.status}`);
      } catch (e) {
        console.error(`[booking] telegram forward error: ${String(e)}`);
      }
    } else {
      console.log("[booking] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — logged only.");
    }
    res.json({ ok: true });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
