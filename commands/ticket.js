const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ticketConfig = require("../lib/ticketConfig");
const { buildTypeSelect } = require("../components/ticketIntake");

async function execute(interaction) {
  const config = ticketConfig.loadConfig();
  if (!config.intakeChannelId) {
    return interaction.reply({
      content: "Ticket system is not configured. Ask an admin to run `/ticket-setup`.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: "**Choose your request type:**",
    components: [buildTypeSelect()],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open a new support ticket"),
  execute,
};
