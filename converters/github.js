import { short } from "../utils.js";

const DISCORD_API = "https://discord.com/api/webhooks";
const GITHUB_ICON = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

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
        icon_url: GITHUB_ICON,
        ...options.footer,
      },
    }],
  };
}

export default function (app) {
  app.post("/hooks/:id/:token/github", async (req, res) => {
    if (!req.body) {
      return res.sendStatus(400);
    }

    const { id, token } = req.params;
    const body = req.body;
    const event = req.headers["x-github-event"];

    // Push event
    if (event === "push" && body.commits?.length > 0) {
      const branch = body.ref.replace("refs/heads/", "");
      let description = "";

      if (body.commits.length === 1) {
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
        url: body.repository.html_url,
        description: short(description),
        author: {
          name: body.pusher.name,
          url: body.commits[0].url,
          icon_url: body.sender.avatar_url,
        },
        color: COLORS.default,
        footer: {
          text: `${body.repository.name}/${branch}`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Release event
    else if (event === "release" && body.action === "published") {
      const discord = createEmbed({
        url: body.release.html_url,
        title: body.release.name || body.release.tag_name,
        description: short(body.release.body || ""),
        author: {
          name: body.repository.full_name,
          url: body.release.html_url,
          icon_url: body.sender.avatar_url,
        },
        color: COLORS.default,
        footer: { text: "Release" },
      });

      await sendToDiscord(id, token, discord);
    }

    // Workflow run event (GitHub Actions)
    else if (event === "workflow_run") {
      const status = body.workflow_run.conclusion;
      let desc = "";
      let rgb = 0;

      if (status === "success") {
        const duration = Math.round(
          (new Date(body.workflow_run.updated_at) - new Date(body.workflow_run.run_started_at)) / 1000
        );
        desc = `Workflow **${body.workflow_run.name}** was **successful**\nTook ${duration} seconds.`;
        rgb = COLORS.success;
      } else if (status === "failure") {
        desc = `Workflow **${body.workflow_run.name}** has **failed**. Check the logs!`;
        rgb = COLORS.failure;
      }

      if (desc && body.action === "completed") {
        const discord = createEmbed({
          url: body.workflow_run.html_url,
          description: desc,
          author: {
            name: body.sender.login,
            url: body.workflow_run.html_url,
            icon_url: body.sender.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.repository.name}/${body.workflow_run.head_branch}`,
          },
        });

        await sendToDiscord(id, token, discord);
      }
    }

    // Check run event (alternative CI status)
    else if (event === "check_run" && body.action === "completed") {
      const status = body.check_run.conclusion;
      let desc = "";
      let rgb = 0;

      if (status === "success") {
        desc = `Check **${body.check_run.name}** was **successful**`;
        rgb = COLORS.success;
      } else if (status === "failure") {
        desc = `Check **${body.check_run.name}** has **failed**. Check the logs!`;
        rgb = COLORS.failure;
      }

      if (desc) {
        const discord = createEmbed({
          url: body.check_run.html_url,
          description: desc,
          author: {
            name: body.sender.login,
            url: body.check_run.html_url,
            icon_url: body.sender.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.repository.name} | Check Run`,
          },
        });

        await sendToDiscord(id, token, discord);
      }
    }

    // Create event (tags and branches)
    else if (event === "create" && body.ref_type === "tag") {
      const discord = createEmbed({
        description: `New Tag Release: \`${body.ref}\``,
        author: {
          name: body.sender.login,
          url: body.repository.html_url,
          icon_url: body.sender.avatar_url,
        },
        color: COLORS.success,
        footer: {
          text: `Tag Release | ${body.repository.name}`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Pull request event
    else if (event === "pull_request") {
      const action = body.action;
      const pr = body.pull_request;
      const validActions = ["opened", "closed", "reopened"];

      if (validActions.includes(action)) {
        let desc = "";
        let content = "";
        let rgb = 0;

        const sourceBranch = pr.head.ref;
        const targetBranch = pr.base.ref;

        if (action === "opened" || action === "reopened") {
          desc = `${body.sender.login} is looking to merge branch \`${sourceBranch}\` into \`${targetBranch}\``;
          if (pr.body) {
            content = pr.body;
          }
          rgb = COLORS.opened;
        } else if (action === "closed" && pr.merged) {
          desc = `${body.sender.login} has merged branch \`${sourceBranch}\` into \`${targetBranch}\``;
          rgb = COLORS.merged;
        } else if (action === "closed" && !pr.merged) {
          desc = `${body.sender.login} has closed the pull request for branch \`${sourceBranch}\` into \`${targetBranch}\``;
          rgb = COLORS.closed;
        }

        const baseEmbed = {
          url: pr.html_url,
          title: pr.title,
          author: {
            name: body.sender.login,
            url: pr.html_url,
            icon_url: body.sender.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.repository.name} | Pull Request`,
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

    // Issue comment event
    else if (event === "issue_comment" && body.action === "created") {
      const issuePr = body.issue.pull_request ? "Pull Request" : "Issue";
      const title = `${body.sender.login} commented on ${issuePr} \`${body.issue.title}\``;

      const discord = createEmbed({
        url: body.comment.html_url,
        fields: [{
          name: title,
          value: short(body.comment.body),
          inline: false,
        }],
        author: {
          name: body.sender.login,
          url: body.comment.html_url,
          icon_url: body.sender.avatar_url,
        },
        color: COLORS.merged,
        footer: {
          text: `${body.repository.name} | Comment`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Pull request review comment event
    else if (event === "pull_request_review_comment" && body.action === "created") {
      const title = `${body.sender.login} commented on Pull Request \`${body.pull_request.title}\``;

      const discord = createEmbed({
        url: body.comment.html_url,
        fields: [{
          name: title,
          value: short(body.comment.body),
          inline: false,
        }],
        author: {
          name: body.sender.login,
          url: body.comment.html_url,
          icon_url: body.sender.avatar_url,
        },
        color: COLORS.merged,
        footer: {
          text: `${body.repository.name} | Review Comment`,
        },
      });

      await sendToDiscord(id, token, discord);
    }

    // Issues event
    else if (event === "issues") {
      const action = body.action;
      const issue = body.issue;
      const validActions = ["opened", "closed", "reopened"];

      if (validActions.includes(action)) {
        let desc = "";
        let content = "";
        let rgb = 0;

        if (action === "opened" || action === "reopened") {
          desc = `${body.sender.login} has ${action} an issue \`${issue.title}\``;
          if (issue.body) {
            content = issue.body;
          }
          rgb = COLORS.opened;
        } else if (action === "closed") {
          desc = `${body.sender.login} has closed an issue \`${issue.title}\``;
          rgb = COLORS.closed;
        }

        const baseEmbed = {
          url: issue.html_url,
          author: {
            name: body.sender.login,
            url: issue.html_url,
            icon_url: body.sender.avatar_url,
          },
          color: rgb,
          footer: {
            text: `${body.repository.name} | Issue`,
          },
        };

        const discord = content
          ? createEmbed({
              ...baseEmbed,
              fields: [{
                name: desc,
                value: short(content),
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
