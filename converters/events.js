const DISCORD_API = "https://discord.com/api/webhooks";

function durationSeconds(timeExpr) {
  const units = { h: 3600, m: 60, s: 1 };
  const regex = /(\d+)([hms])/g;

  let seconds = 0;
  let match;
  while ((match = regex.exec(timeExpr))) {
    seconds += parseInt(match[1], 10) * units[match[2]];
  }

  return seconds;
}

async function sendToDiscord(id, token, payload) {
  try {
    await fetch(`${DISCORD_API}/${id}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send to Discord:", error);
  }
}

export default function (app) {
  app.post("/hooks/:id/:token/events", async (req, res) => {
    const { id, token } = req.params;
    const data = req.body;
    const time = durationSeconds(data.date);
    const eventTime = Math.round(Date.now() / 1000) + time;

    const discord = {
      content: `<@&${data.role}>`,
      embeds: [{
        type: "rich",
        title: "Event Alert",
        description: `An event will be starting at <t:${eventTime}:t>!`,
        color: 0x07cb00,
        fields: [
          {
            name: "Event Name",
            value: data.name,
            inline: true,
          },
          {
            name: "Event Time",
            value: `<t:${eventTime}:R>`,
            inline: true,
          },
          {
            name: "Event Map",
            value: `\`${data.map}\``,
            inline: true,
          },
          {
            name: "Description",
            value: data.description || "No Description Provided",
          },
        ],
      }],
    };

    await sendToDiscord(id, token, discord);
    res.send("");
  });
}
