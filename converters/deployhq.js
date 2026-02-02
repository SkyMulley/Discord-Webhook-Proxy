const DISCORD_API = "https://discord.com/api/webhooks";
const DEPLOYHQ_ICON = "https://www.deployhq.com/assets/logo-square.png";

const COLORS = {
  completed: 40000,
  failed: 10430000,
  running: 226760,
};

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
  app.post("/hooks/:id/:token/deployhq", async (req, res) => {
    const { id, token } = req.params;

    let data;
    try {
      data = JSON.parse(req.body.payload);
    } catch {
      return res.status(400).json({ error: "Invalid payload" });
    }

    let desc;
    let rgb;

    if (data.status === "completed") {
      desc = "Deployment was **successful**";
      rgb = COLORS.completed;
    } else if (data.status === "failed") {
      desc = "Deployment has **failed**. Check the logs!";
      rgb = COLORS.failed;
    } else if (data.status === "running") {
      desc = "Deployment is now running";
      rgb = COLORS.running;
    } else {
      return res.send("");
    }

    const discord = {
      embeds: [{
        type: "rich",
        description: desc,
        footer: {
          icon_url: DEPLOYHQ_ICON,
          text: data.project.name,
        },
        color: rgb,
        timestamp: new Date().toISOString(),
      }],
    };

    await sendToDiscord(id, token, discord);
    res.send("");
  });
}
