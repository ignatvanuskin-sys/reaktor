// Vercel serverless function — POST /api/booking
//
// NOTE: intentionally self-contained (no cross-directory imports).
// Vercel function bundling is most reliable this way.
// Logic mirrors shared/booking.ts (used by the Express server) —
// keep them in sync when validation rules change.

const text = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  let raw = req.body;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  const b = raw && typeof raw === "object" ? raw : {};
  const booking = {
    brand: text(b.brand),
    model: text(b.model),
    year: text(b.year).slice(0, 4),
    date: text(b.date),
    time: text(b.time),
    name: text(b.name),
    phone: text(b.phone),
    service: text(b.service),
    servicePrice: text(b.servicePrice),
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
  const when = [booking.date, booking.time].filter(Boolean).join(" · ");
  const message = [
    "Новая заявка с сайта",
    `Авто: ${booking.brand} ${booking.model}${booking.year ? ` (${booking.year})` : ""}`,
    `Услуга: ${booking.service}${booking.servicePrice ? ` (ориентир: ${booking.servicePrice})` : ""}`,
    when ? `Когда: ${when}` : "",
    `Клиент: ${booking.name} · ${booking.phone}`,
    `Связь: ${booking.channel}${booking.telegram ? ` (${booking.telegram})` : ""}`,
    booking.problem ? `Проблема: ${booking.problem}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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
  res.status(200).json({ ok: true });
}
