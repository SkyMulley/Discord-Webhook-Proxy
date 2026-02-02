import { short } from "../utils.js";

const DISCORD_API = "https://discord.com/api/webhooks";
const GITLAB_ICON = "https://about.gitlab.com/images/press/press-kit-icon.png";

const COLORS = {
  default: 226760,
  success: 40000,
  failure: 10430000,
  opened: 8069775,
  merged: 8311585,
  closed: 16711682,
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

function createEmbed(options) {
  return {
    embeds: [{
      type: "rich",
      ...options,
      timestamp: new Date().toISOString(),
      footer: {
        icon_url: GITLAB_ICON,
        ...options.footer,
      },
    }],
  };
}

export default function (app) {
  app.post("/hooks/:id/:token/gitlab", async (req, res) => {
    if (!req.body) {
      return res.sendStatus(400);
    }

    const { id, token } = req.params;
    const body = req.body;
    const kind = body.object_kind;

    // Push event
    if (kind === "push" && body.commits?.[0]?.message?.charAt(0) !== "#") {
      let description = "";

      if (body.total_commits_count === 1) {
        const commit = body.commits[0].message;
        description = commit.charAt(0) === "~"
          ? "This commit has been marked as private"
          : commit;
      } else {
        for (const commit of body.commits) {
          if (!commit.message.includes("Merge") && !commit.message.includes("branch")) {
            if (commit.message.charAt(0) === "~") {
              description += "- This commit has been marked as private\n";
            } else {
              description += `- ${commit.message.split("\n")[0]}\n`;
            }
          }
        }
      }

      const discord = createEmbed({
        url: body.project.web_url,
        description: short(description),
        author: {
          name: body.user_name,
          url: `${body.project.web_url}/commit/${body.commits[0].id}`,
          icon_url: body.user_avatar,
        },
        color: COLORS.default,
        footer: {
          text: `${body.project.name}/${body.ref.slice(11)}`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Release event
    else if (kind === "release") {
      const discord = createEmbed({
        url: body.project.web_url,
        description: body.description,
        author: {
          name: body.project.name,
          url: body.url,
        },
        color: COLORS.default,
        footer: { text: "Release" },
      });

      await sendToDiscord(id, token, discord);
    }

    // Pipeline event
    else if (kind === "pipeline") {
      const status = body.object_attributes.status;
      let desc = "";
      let rgb = 0;

      if (status === "success") {
        desc = `Pipeline event was **successful**\nTook ${body.object_attributes.duration} seconds.`;
        rgb = COLORS.success;
      } else if (status === "failed") {
        desc = "Pipeline event has **failed**. Check the logs!";
        rgb = COLORS.failure;
      }

      if (desc) {
        const discord = createEmbed({
          url: body.project.web_url,
          description: desc,
          author: {
            name: body.user.name,
            url: `${body.project.web_url}/pipelines/${body.object_attributes.id}`,
            icon_url: body.user.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.project.name}/${body.object_attributes.ref}`,
          },
        });

        await sendToDiscord(id, token, discord);
      }
    }

    // Tag push event
    else if (kind === "tag_push") {
      const discord = createEmbed({
        description: `New Tag Release: \`${body.ref.replace("refs/tags/", "")}\``,
        author: {
          name: body.user_name,
          url: body.project.web_url,
        },
        color: COLORS.success,
        footer: {
          text: `Tag Release | ${body.project.name}`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Merge request event
    else if (kind === "merge_request") {
      const action = body.object_attributes.action;
      const state = body.object_attributes.state;
      const validActions = [undefined, "open", "close", "reopen", "merge"];

      if (validActions.includes(action)) {
        let desc = "";
        let content = "";
        let rgb = 0;

        const sourceBranch = body.object_attributes.source_branch;
        const targetBranch = body.object_attributes.target_branch;

        if (state === "opened") {
          desc = `${body.user.name} is looking to merge branch \`${sourceBranch}\` into \`${targetBranch}\``;
          if (body.object_attributes.description) {
            content = body.object_attributes.description;
          }
          rgb = COLORS.opened;
        } else if (state === "merged") {
          desc = `${body.user.name} has merged branch \`${sourceBranch}\` into \`${targetBranch}\``;
          rgb = COLORS.merged;
        } else if (state === "closed") {
          desc = `${body.user.name} has closed the merge request for branch \`${sourceBranch}\` into \`${targetBranch}\``;
          rgb = COLORS.closed;
        }

        const baseEmbed = {
          url: body.project.web_url,
          title: body.object_attributes.title,
          author: {
            name: body.user.name,
            url: `${body.project.web_url}/merge_requests/${body.object_attributes.iid}`,
            icon_url: body.user.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.project.name} | Merge Request`,
          },
        };

        const discord = content
          ? createEmbed({
              ...baseEmbed,
              fields: [{
                name: short(desc),
                value: short(content),
                inline: false,
              }],
            })
          : createEmbed({
              ...baseEmbed,
              description: short(desc),
            });

        await sendToDiscord(id, token, discord);
      }
    }

    // Note (comment) event
    else if (kind === "note") {
      let title = "";
      const noteType = body.object_attributes.noteable_type;

      if (noteType === "Commit") {
        title = `${body.user.name} commented on Commit \`${body.commit.message}\``;
      } else if (noteType === "MergeRequest") {
        title = `${body.user.name} commented on Merge Request \`${body.merge_request.title}\``;
      } else if (noteType === "Issue") {
        title = `${body.user.name} commented on Issue \`${body.issue.title}\``;
      }

      if (body.object_attributes.note) {
        const discord = createEmbed({
          url: body.object_attributes.url,
          fields: [{
            name: title,
            value: body.object_attributes.note,
            inline: false,
          }],
          author: {
            name: body.user.name,
            url: body.object_attributes.url,
            icon_url: body.user.avatar_url,
          },
          color: COLORS.merged,
          footer: {
            text: `${body.project.name} | Comment`,
          },
        });

        await sendToDiscord(id, token, discord);
      }
    }

    // Issue event
    else if (kind === "issue") {
      const action = body.object_attributes.action;
      const validActions = ["open", "close", "reopen"];

      if (validActions.includes(action)) {
        const state = body.object_attributes.state;
        let desc = "";
        let content = "";
        let rgb = 0;

        if (state === "opened") {
          desc = `${body.user.name} has opened an issue \`${body.object_attributes.title}\``;
          if (body.object_attributes.description) {
            content = body.object_attributes.description;
          }
          rgb = COLORS.opened;
        } else if (state === "closed") {
          desc = `${body.user.name} has closed an issue \`${body.object_attributes.title}\``;
          rgb = COLORS.closed;
        }

        const baseEmbed = {
          url: body.project.web_url,
          author: {
            name: body.user.name,
            url: body.object_attributes.url,
            icon_url: body.user.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.project.name} | Issue`,
          },
        };

        const discord = content
          ? createEmbed({
              ...baseEmbed,
              fields: [{
                name: desc,
                value: content,
                inline: false,
              }],
            })
          : createEmbed({
              ...baseEmbed,
              description: desc,
            });

        await sendToDiscord(id, token, discord);
      }
    }

    res.send("");
  });
}
