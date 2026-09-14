import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { formatBookingMessage, forwardToTelegram, parseBooking, validateBooking } from "../shared/booking.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "32kb" }));

  // Booking endpoint: validates, logs, forwards to Telegram if configured.
  // Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env to notify the admin.
  app.post("/api/booking", async (req, res) => {
    const booking = parseBooking(req.body);
    const error = validateBooking(booking);
    if (error) {
      res.status(400).json({ ok: false, error });
      return;
    }
    const message = formatBookingMessage(booking);
    console.log(`[booking] ${message.replace(/\n/g, " | ")}`);
    await forwardToTelegram(message);
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
