// api/discord.js
export default async function handler(req, res) {
  if (req.method === "POST") {
    const { message } = req.body;

    const webhookURL = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookURL) {
      return res.status(500).json({ error: "Webhook URL is not defined" });
    }

    try {
      const response = await fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) {
        return res.status(500).json({ error: "Failed to send notification" });
      }

      res.status(200).json({ message: "Notification sent" });
    } catch (error) {
      res.status(500).json({ error: "Error sending notification" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}