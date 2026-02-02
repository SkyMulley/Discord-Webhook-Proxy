const DEPLOYHQ_API = "https://rti.deployhq.com/deploy";

async function triggerDeploy(id, token, payload) {
  try {
    await fetch(`${DEPLOYHQ_API}/${id}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to trigger deploy:", error);
  }
}

export default function (app) {
  app.post("/hooks/:id/:token/gitdeploy", async (req, res) => {
    const { id, token } = req.params;
    const data = req.body;

    if (data.object_attributes?.status === "success") {
      const payload = {
        payload: {
          new_ref: "latest",
          branch: data.object_attributes.ref,
          clone_url: data.project.web_url,
          email: data.user.email,
        },
      };

      await triggerDeploy(id, token, payload);
    }

    res.send("");
  });
}
