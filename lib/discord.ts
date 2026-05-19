export async function sendDiscordNotification(data: {
  name: string;
  phone: string;
  address: string;
  services: string[];
  estimatedPrice?: number;
}) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    console.error("Missing Discord webhook URL");
    return;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: "🟢 New Quote Submission",
            color: 3066993,
            fields: [
              {
                name: "Customer",
                value: data.name,
                inline: true,
              },
              {
                name: "Phone",
                value: data.phone,
                inline: true,
              },
              {
                name: "Address",
                value: data.address,
              },
              {
                name: "Services",
                value: data.services.join(", "),
              },
              {
                name: "Estimate",
                value: data.estimatedPrice
                  ? `$${data.estimatedPrice}`
                  : "N/A",
              },
            ],
            footer: {
              text: "Ginkgo CRM",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}
