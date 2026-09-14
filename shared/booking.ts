export interface BookingPayload {
  brand: string;
  model: string;
  year: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  service: string;
  problem: string;
  channel: string;
  telegram: string;
  consent: boolean;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Normalize + sanitize raw request body into a BookingPayload. Never throws. */
export function parseBooking(body: unknown): BookingPayload {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  return {
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
}

/** Returns an error message when invalid, null when valid. */
export function validateBooking(b: BookingPayload): string | null {
  if (!b.brand || !b.model || !b.service) return "Заполните авто и услугу.";
  if (!b.name || b.phone.replace(/\D/g, "").length !== 11 || !b.consent)
    return "Укажите имя, телефон и согласие на обработку данных.";
  return null;
}

export function formatBookingMessage(b: BookingPayload): string {
  const when = [b.date, b.time].filter(Boolean).join(" · ");
  return [
    "Новая заявка с сайта",
    `Авто: ${b.brand} ${b.model}${b.year ? ` (${b.year})` : ""}`,
    `Услуга: ${b.service}`,
    when ? `Когда: ${when}` : "",
    `Клиент: ${b.name} · ${b.phone}`,
    `Связь: ${b.channel}${b.telegram ? ` (${b.telegram})` : ""}`,
    b.problem ? `Проблема: ${b.problem}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Forwards the message to Telegram when TELEGRAM_BOT_TOKEN +
 * TELEGRAM_CHAT_ID are set. Never throws — logs and resolves otherwise.
 */
export async function forwardToTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log("[booking] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — logged only.");
    return;
  }
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
}
