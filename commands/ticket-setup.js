const { SlashCommandBuilder, ChannelType, MessageFlags } = require("discord.js");
const { canUseAdminCommand } = require("../lib/auth");
const ticketConfig = require("../lib/ticketConfig");
const { buildIntakeButton } = require("../components/ticketIntake");

async function execute(interaction, adminRoleName) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!canUseAdminCommand(interaction.member, guild, adminRoleName)) {
    return interaction.reply({
      content: `You need the **${adminRoleName}** role to configure the ticket system.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const config = ticketConfig.loadConfig();

  const intakeChannel = interaction.options.getChannel("intake_channel") ?? (config.intakeChannelId && guild.channels.cache.get(config.intakeChannelId));
  const staffLogChannel = interaction.options.getChannel("staff_log_channel") ?? (config.staffLogChannelId && guild.channels.cache.get(config.staffLogChannelId));
  const archiveChannel = interaction.options.getChannel("archive_channel") ?? (config.ticketArchiveChannelId && guild.channels.cache.get(config.ticketArchiveChannelId));
  const generalRole = interaction.options.getString("general_staff_role") ?? config.generalStaffRoleName;
  const generalCount = interaction.options.getInteger("general_staff_count") ?? config.generalStaffCount;
  const fablabRole = interaction.options.getString("fablab_staff_role") ?? config.fablabStaffRoleName;
  const fablabCount = interaction.options.getInteger("fablab_staff_count") ?? config.fablabStaffCount;
  const assignmentMode = interaction.options.getString("assignment_mode") ?? config.assignmentMode;

  if (!intakeChannel) {
    return interaction.reply({
      content: "Provide `intake_channel` or set `TICKET_INTAKE_CHANNEL_ID` in .env / tickets/config.json first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  config.intakeChannelId = intakeChannel.id;
  config.staffLogChannelId = staffLogChannel?.id ?? "";
  config.ticketArchiveChannelId = archiveChannel?.id ?? "";
  config.generalStaffRoleName = generalRole;
  config.generalStaffCount = Math.max(1, Math.min(10, generalCount));
  config.fablabStaffRoleName = fablabRole;
  config.fablabStaffCount = Math.max(1, Math.min(10, fablabCount));
  config.assignmentMode = ["roundRobin", "random"].includes(assignmentMode) ? assignmentMode : "roundRobin";
  ticketConfig.saveConfig(config);

  const hasButton = interaction.options.getBoolean("post_intake_button") ?? config.postIntakeButton ?? true;
  if (hasButton && intakeChannel) {
    try {
      const messages = await intakeChannel.messages.fetch({ limit: 100 });
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recent = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);
      const old = messages.filter((m) => m.createdTimestamp <= twoWeeksAgo);
      if (recent.size > 0) await intakeChannel.bulkDelete(recent);
      for (const [, msg] of old) {
        try {
          await msg.delete();
        } catch {
          // skip if can't delete (e.g. missing permissions)
        }
      }
      await intakeChannel.send({
        content: "**Submit a request**\nClick the button below or use `/ticket` to open a new ticket.",
        components: [buildIntakeButton()],
      });
    } catch (err) {
      console.warn("Could not clear/post intake button:", err.message);
    }
  }

  await interaction.reply({
    content: `Ticket system configured.\n• Intake: ${intakeChannel}\n• Staff log: ${staffLogChannel || "—"}\n• Archive: ${archiveChannel || "—"}\n• General staff: \`${generalRole}\` (${config.generalStaffCount})\n• Fablab staff: \`${fablabRole}\` (${config.fablabStaffCount})`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Configure the ticket system (admin only)")
    .addChannelOption((o) =>
      o
        .setName("intake_channel")
        .setDescription("Channel for ticket intake (uses config if omitted)")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((o) =>
      o
        .setName("staff_log_channel")
        .setDescription("Private channel for staff/coordinator notifications")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((o) =>
      o
        .setName("archive_channel")
        .setDescription("Channel for closed ticket archive")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((o) =>
      o
        .setName("general_staff_role")
        .setDescription("Role name for general ticket staff")
        .setRequired(false)
    )
    .addIntegerOption((o) =>
      o
        .setName("general_staff_count")
        .setDescription("Number of general staff to assign per ticket")
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addStringOption((o) =>
      o
        .setName("fablab_staff_role")
        .setDescription("Role name for fablab staff")
        .setRequired(false)
    )
    .addIntegerOption((o) =>
      o
        .setName("fablab_staff_count")
        .setDescription("Number of fablab staff to assign per ticket")
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addBooleanOption((o) =>
      o
        .setName("post_intake_button")
        .setDescription("Post the intake button to the channel now")
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName("assignment_mode")
        .setDescription("How to assign staff: roundRobin or random")
        .addChoices(
          { name: "Round Robin", value: "roundRobin" },
          { name: "Random", value: "random" }
        )
    ),
  execute,
};
