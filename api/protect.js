export default async function handler(req, res) {
  const webhookUrl = process.env.DISCORD_WEBHOOK; // hidden in env vars

  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  try {
    const body = req.body;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
