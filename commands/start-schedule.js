const { SlashCommandBuilder, ChannelType } = require("discord.js");
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

  const channel = interaction.options.getChannel("channel", true);
  if (channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: "Please select a text channel.",
      ephemeral: true,
    });
  }

  const timezone = process.env.SCHEDULE_TIMEZONE || "America/Chicago";
  const count = scheduleManager.start(interaction.client, channel, timezone);

  await interaction.reply({
    content: `Schedule started. **${count}** events scheduled in ${channel}.`,
    ephemeral: true,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start-schedule")
    .setDescription("Start posting schedule events to a channel at their scheduled times")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel to post schedule messages to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  execute,
};
