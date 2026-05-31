const ANDREW_ID = "793361587540852756";
const ELVIN_ID = "541457098425499688";

function getDiscordWebhook() {
  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    console.error("Missing Discord webhook URL");
    return null;
  }

  return webhook;
}

export async function sendDiscordNotification(data: {
  name: string;
  phone: string;
  address: string;
  services: string[];
  estimateLow?: number;
  estimateHigh?: number;
}) {
  const webhook = getDiscordWebhook();
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `🚨 New Lead Alert <@${ANDREW_ID}> <@${ELVIN_ID}>`,
        embeds: [
          {
            title: "🟢 New Quote Submission",
            color: 3066993,
            fields: [
              {
                name: "Customer",
                value: data.name || "N/A",
                inline: true,
              },
              {
                name: "Phone",
                value: data.phone || "N/A",
                inline: true,
              },
              {
                name: "Address",
                value: data.address || "N/A",
              },
              {
                name: "Services",
                value:
                  data.services?.length > 0
                    ? data.services.join(", ")
                    : "N/A",
              },
              {
                name: "Estimate",
                value:
                  data.estimateLow && data.estimateHigh
                    ? `$${data.estimateLow} - $${data.estimateHigh}`
                    : "N/A",
                inline: true,
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

    console.log("Discord quote notification sent");
  } catch (err) {
    console.error("Discord quote webhook failed:", err);
  }
}

export async function sendDiscordSmsAlert(data: {
  from: string;
  to: string;
  body: string;
}) {
  const webhook = getDiscordWebhook();
  if (!webhook) return;

  const isOutgoing = data.body.startsWith("📤");

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: isOutgoing
          ? `📤 SMS Sent <@${ANDREW_ID}> <@${ELVIN_ID}>`
          : `💬 New Customer Text <@${ANDREW_ID}> <@${ELVIN_ID}>`,
        embeds: [
          {
            title: isOutgoing ? "Outgoing SMS" : "Incoming SMS Reply",
            color: isOutgoing ? 16753920 : 3447003,
            fields: [
              {
                name: "From",
                value: data.from || "Unknown",
                inline: true,
              },
              {
                name: "To",
                value: data.to || "Unknown",
                inline: true,
              },
              {
                name: "Message",
                value: data.body || "(empty message)",
              },
            ],
            footer: {
              text: "Ginkgo SMS Relay",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    console.log("Discord SMS alert sent");
  } catch (err) {
    console.error("Discord SMS webhook failed:", err);
  }
}
