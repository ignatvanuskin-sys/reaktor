import { formatBookingMessage, forwardToTelegram, parseBooking, validateBooking } from "../shared/booking";

interface BookingApiRequest {
  method?: string;
  body: unknown;
}

interface BookingApiResponse {
  status(code: number): BookingApiResponse;
  json(body: unknown): void;
}

/** Vercel serverless function — POST /api/booking */
export default async function handler(req: BookingApiRequest, res: BookingApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  let raw: unknown = req.body;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      raw = {};
    }
  }
  const booking = parseBooking(raw);
  const error = validateBooking(booking);
  if (error) {
    res.status(400).json({ ok: false, error });
    return;
  }
  const message = formatBookingMessage(booking);
  console.log(`[booking] ${message.replace(/\n/g, " | ")}`);
  await forwardToTelegram(message);
  res.status(200).json({ ok: true });
}
