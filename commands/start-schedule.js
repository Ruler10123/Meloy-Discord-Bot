const { SlashCommandBuilder, ChannelType, MessageFlags } = require("discord.js");
const { canUseAdminCommand } = require("../lib/auth");
const scheduleManager = require("../lib/scheduleManager");

async function execute(interaction, adminRoleName) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const caller = interaction.member;
  if (!canUseAdminCommand(caller, guild, adminRoleName)) {
    return interaction.reply({
      content: `You need the **${adminRoleName}** role to use this command.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = interaction.options.getChannel("channel", true);
  const isPostable = [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type);
  if (!isPostable) {
    return interaction.reply({
      content: "Please select a text or announcement channel.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const timezone = process.env.SCHEDULE_TIMEZONE || "America/Chicago";
  const count = scheduleManager.start(interaction.client, channel, timezone);

  await interaction.reply({
    content: `Schedule started. **${count}** events scheduled in ${channel}.`,
    flags: MessageFlags.Ephemeral,
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
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),
  execute,
};
