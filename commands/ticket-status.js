const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ticketConfig = require("../lib/ticketConfig");
const ticketManager = require("../lib/ticketManager");

async function execute(interaction) {
  const config = ticketConfig.loadConfig();
  const isStaff = interaction.member.roles.cache.some(
    (r) =>
      r.name === (config.generalStaffRoleName || "Staff") ||
      r.name === (config.fablabStaffRoleName || "Fablab Staff")
  );

  if (!isStaff) {
    return interaction.reply({
      content: "Only staff can update ticket status.",
      flags: MessageFlags.Ephemeral,
    });
  }

  let ticketId = interaction.options.getInteger("ticket_id");
  if (!ticketId && interaction.channel?.isThread()) {
    const match = interaction.channel.name.match(/ticket-(?:general|fablab)-(\d+)/);
    if (match) ticketId = parseInt(match[1], 10);
  }

  if (!ticketId) {
    return interaction.reply({
      content: "Provide a ticket ID or use this command in a ticket thread.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticket = ticketConfig.loadTicketLog().tickets?.find((t) => t.id === ticketId);
  if (!ticket) {
    return interaction.reply({
      content: "Ticket not found.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const row = ticketManager.buildStatusSelect(ticketId);
  await interaction.reply({
    content: "**Update ticket status:**",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-status")
    .setDescription("Update ticket status (staff only)")
    .addIntegerOption((o) =>
      o.setName("ticket_id").setDescription("Ticket ID (optional if used in ticket thread)")
    ),
  execute,
};
