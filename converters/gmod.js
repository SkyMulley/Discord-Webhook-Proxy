const DISCORD_API = "https://discord.com/api/webhooks";
const GMOD_ICON = "https://upload.wikimedia.org/wikipedia/commons/3/34/Gmod_logo.png";

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
  app.post("/hooks/:id/:token/gmod", async (req, res) => {
    const { id, token } = req.params;
    const data = req.body;

    const discord = {
      embeds: [{
        type: "rich",
        description: data.msg,
        author: {
          name: data.ply,
        },
        color: 226760,
        timestamp: new Date().toISOString(),
        footer: {
          icon_url: GMOD_ICON,
          text: data.title,
        },
      }],
    };

    await sendToDiscord(id, token, discord);
    res.send("");
  });
}
