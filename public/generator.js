// Supports both discord.com and legacy discordapp.com URLs
const DISCORD_REGEX = /https?:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)/;

function buildUrl() {
  const discordInput = document.getElementById("discord-webhook-url");
  const webhookOutput = document.getElementById("webhook-url");
  const discordUrl = discordInput.value.trim();

  // Reset validation state
  discordInput.classList.remove("is-invalid");

  if (!discordUrl) {
    discordInput.classList.add("is-invalid");
    webhookOutput.value = "";
    return;
  }

  const matches = discordUrl.match(DISCORD_REGEX);
  if (!matches) {
    discordInput.classList.add("is-invalid");
    webhookOutput.value = "";
    return;
  }

  const [, id, token] = matches;
  const selectedType = document.querySelector(".output-type:checked");

  if (!selectedType) {
    webhookOutput.value = "";
    return;
  }

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  webhookOutput.value = `${baseUrl}/hooks/${id}/${token}/${selectedType.value}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const discordInput = document.getElementById("discord-webhook-url");
  const outputTypes = document.querySelectorAll(".output-type");

  discordInput.addEventListener("input", buildUrl);

  outputTypes.forEach((radio) => {
    radio.addEventListener("change", buildUrl);
  });
});
