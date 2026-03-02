const { SlashCommandBuilder } = require("discord.js");
const { canUseAdminCommand } = require("../lib/auth");
const scheduleManager = require("../lib/scheduleManager");

async function execute(interaction, adminRoleName) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
  }

  const caller = interaction.member;
  if (!canUseAdminCommand(caller, guild, adminRoleName)) {
    return interaction.reply({
      content: `You need the **${adminRoleName}** role to use this command.`,
      ephemeral: true,
    });
  }

  scheduleManager.end();

  await interaction.reply({
    content: "Schedule ended. All scheduled posts cancelled.",
    ephemeral: true,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("end-schedule")
    .setDescription("Stop the schedule and cancel all scheduled posts"),
  execute,
};
