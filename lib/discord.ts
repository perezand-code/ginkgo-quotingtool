export async function sendDiscordNotification(data: {
  name: string;
  phone: string;
  address: string;
  services: string[];
  estimateLow?: number;
  estimateHigh?: number;
}) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    console.error("Missing Discord webhook URL");
    return;
  }

  // REPLACE THESE WITH YOUR REAL DISCORD USER IDS
  const ANDREW_ID = "793361587540852756";
  const ELVIN_ID = "541457098425499688";

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

    console.log("Discord notification sent");
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}
