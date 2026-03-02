const ticketConfig = require("../lib/ticketConfig");
const ticketManager = require("../lib/ticketManager");
const { canUseAdminCommand } = require("../lib/auth");

const ARCHIVABLE_STATUSES = ["Completed", "Denied / Closed"];

async function handleStatusSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  const match = interaction.customId?.match(/^ticket-status:(\d+)$/);
  if (!match) return false;

  const ticketId = parseInt(match[1], 10);
  const newStatus = interaction.values[0];

  const adminRoleName = process.env.ADMIN_ROLE_NAME || "Admin";
  const isStaff =
    canUseAdminCommand(interaction.member, interaction.guild, adminRoleName) ||
    interaction.member.roles.cache.some(
      (r) =>
        r.name === (ticketConfig.loadConfig().generalStaffRoleName || "Staff") ||
        r.name === (ticketConfig.loadConfig().fablabStaffRoleName || "Fablab Staff")
    );

  if (!isStaff) {
    return interaction.reply({
      content: "Only staff can update ticket status.",
      flags: 64,
    });
  }

  const ticket = await ticketManager.updateStatus(ticketId, newStatus);
  if (!ticket) {
    return interaction.reply({
      content: "Ticket not found.",
      flags: 64,
    });
  }

  const embed = ticketManager.buildSummaryEmbed(ticket);
  const row = ticketManager.buildStatusSelect(ticketId);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });

  if (ARCHIVABLE_STATUSES.includes(newStatus)) {
    await ticketManager.archiveTicket(interaction.client, ticket);
  }

  return true;
}

module.exports = {
  handleStatusSelect,
};
