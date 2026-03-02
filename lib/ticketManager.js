const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const ticketConfig = require("./ticketConfig");

const STATUSES = [
  "New Request",
  "Needs Clarification",
  "Approved",
  "In Progress",
  "Ready for Pickup",
  "Completed",
  "Denied / Closed",
];

const STATUSES_DROPDOWN = ["Needs Clarification", "In Progress", "Completed"];

const REQUEST_TYPES = {
  general: "General Question",
  fablab: "Fablab / Prototyping / 3D Printing Question",
};

function getAssignedStaff(guild, config, type) {
  const roleName = type === "general" ? config.generalStaffRoleName : config.fablabStaffRoleName;
  const count = type === "general" ? config.generalStaffCount : config.fablabStaffCount;
  const role = guild.roles.cache.find((r) => r.name === roleName);
  if (!role) return [];

  const members = role.members.filter((m) => !m.user.bot);
  const arr = [...members.values()];
  if (arr.length === 0) return [];

  if (config.assignmentMode === "random") {
    return arr.sort(() => Math.random() - 0.5).slice(0, count);
  }
  const log = ticketConfig.loadTicketLog();
  const lastIdx = (log._lastAssignmentIndex || {})[type] ?? -1;
  const start = (lastIdx + 1) % Math.max(arr.length, 1);
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(arr[(start + i) % arr.length]);
  }
  log._lastAssignmentIndex = log._lastAssignmentIndex || {};
  log._lastAssignmentIndex[type] = (start + count - 1) % arr.length;
  ticketConfig.saveTicketLog(log);
  return picked;
}

function buildSummaryEmbed(ticket) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Ticket #${String(ticket.id).padStart(3, "0")}`)
    .addFields(
      { name: "Request Type", value: ticket.typeLabel, inline: true },
      { name: "Requester", value: `<@${ticket.requesterId}>`, inline: true },
      { name: "Status", value: ticket.status, inline: true },
      { name: "Assigned Staff", value: ticket.assignedStaff.map((id) => `<@${id}>`).join(", ") || "—", inline: false },
      { name: "Created", value: `<t:${Math.floor(ticket.createdAt / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: `ID: ${ticket.id}` })
    .setTimestamp(ticket.createdAt);

  if (ticket.description) {
    embed.addFields({ name: "Description", value: ticket.description.slice(0, 1024), inline: false });
  }
  if (ticket.fablabInfo) {
    const info = ticket.fablabInfo;
    const parts = [];
    if (info.dimensions) parts.push(`**Dimensions:** ${info.dimensions}`);
    if (info.quantity) parts.push(`**Quantity:** ${info.quantity}`);
    if (info.deadline) parts.push(`**Deadline:** ${info.deadline}`);
    if (info.material) parts.push(`**Material/Color:** ${info.material}`);
    if (parts.length) embed.addFields({ name: "Fablab Details", value: parts.join("\n"), inline: false });
  }
  return embed;
}

function buildStatusSelect(ticketId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket-status:${ticketId}`)
      .setPlaceholder("Update status")
      .addOptions(
        STATUSES_DROPDOWN.map((s) => ({
          label: s,
          value: s,
        }))
      )
  );
}

async function createTicket(guild, config, type, requesterId, data) {
  const log = ticketConfig.loadTicketLog();
  const id = ticketConfig.getNextTicketId(log);
  ticketConfig.saveTicketLog(log);

  const typeLabel = REQUEST_TYPES[type];
  const assigned = getAssignedStaff(guild, config, type);
  const assignedIds = assigned.map((m) => m.id);

  const ticket = {
    id,
    type,
    typeLabel,
    requesterId,
    assignedStaff: assignedIds,
    status: "New Request",
    createdAt: Date.now(),
    description: data.description || "",
    fablabInfo: data.fablabInfo || null,
    threadId: null,
  };

  const intakeChannel = guild.channels.cache.get(config.intakeChannelId);
  if (!intakeChannel) throw new Error("Intake channel not configured");

  const thread = await intakeChannel.threads.create({
    name: `ticket-${type}-${String(id).padStart(3, "0")}`,
    type: ChannelType.PrivateThread,
    reason: `Ticket #${id} - ${typeLabel}`,
  });

  ticket.threadId = thread.id;

  await thread.members.add(requesterId);
  for (const m of assigned) {
    await thread.members.add(m.id);
  }

  const embed = buildSummaryEmbed(ticket);
  const row = buildStatusSelect(id);
  const pingText = assignedIds.length
    ? assignedIds.map((id) => `<@${id}>`).join(" ") + " — new ticket assigned"
    : "";

  await thread.send({
    content: pingText || undefined,
    embeds: [embed],
    components: [row],
  });

  log.tickets = log.tickets || [];
  log.tickets.push(ticket);
  ticketConfig.saveTicketLog(log);

  if (config.staffLogChannelId) {
    const staffChannel = guild.channels.cache.get(config.staffLogChannelId);
    if (staffChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle(`New Ticket #${String(id).padStart(3, "0")}`)
        .addFields(
          { name: "Type", value: typeLabel, inline: true },
          { name: "Requester", value: `<@${requesterId}>`, inline: true },
          { name: "Thread", value: `<#${thread.id}>`, inline: true }
        )
        .setTimestamp();
      await staffChannel.send({ embeds: [logEmbed] });
    }
  }

  return { ticket, thread };
}

async function updateStatus(ticketId, newStatus) {
  const log = ticketConfig.loadTicketLog();
  const ticket = log.tickets?.find((t) => t.id === ticketId);
  if (!ticket) return null;

  ticket.status = newStatus;
  ticket.updatedAt = Date.now();
  ticketConfig.saveTicketLog(log);
  return ticket;
}

async function notifyStaffLogStatusChange(client, ticket, updatedByUserId) {
  const config = ticketConfig.loadConfig();
  if (!config.staffLogChannelId) return;
  const staffChannel = client.channels.cache.get(config.staffLogChannelId) ?? await client.channels.fetch(config.staffLogChannelId).catch(() => null);
  if (!staffChannel) return;

  const embed = new EmbedBuilder()
    .setColor(ticket.status === "Completed" ? 0xed4245 : 0xfee75c)
    .setTitle(`Status Update: Ticket #${String(ticket.id).padStart(3, "0")}`)
    .addFields(
      { name: "New Status", value: ticket.status, inline: true },
      { name: "Updated by", value: `<@${updatedByUserId}>`, inline: true },
      { name: "Thread", value: ticket.threadId ? `<#${ticket.threadId}>` : "—", inline: true }
    )
    .setTimestamp();
  await staffChannel.send({ embeds: [embed] });
}

async function archiveTicket(client, ticket) {
  if (ticket.threadId) {
    try {
      const thread = client.channels.cache.get(ticket.threadId) ?? await client.channels.fetch(ticket.threadId).catch(() => null);
      if (thread?.isThread()) await thread.setArchived(true);
    } catch (err) {
      console.warn("Could not archive thread:", err.message);
    }
  }

  const config = ticketConfig.loadConfig();
  const archiveChannel = client.guilds.cache
    .flatMap((g) => g.channels.cache)
    .find((c) => c.id === config.ticketArchiveChannelId);

  if (archiveChannel) {
    const embed = buildSummaryEmbed(ticket);
    embed.setColor(0x99aab5);
    embed.setTitle(`Archived: Ticket #${String(ticket.id).padStart(3, "0")}`);
    await archiveChannel.send({ embeds: [embed] });
  }

  const log = ticketConfig.loadTicketLog();
  log.tickets = log.tickets?.filter((t) => t.id !== ticket.id) ?? [];
  log.closed = log.closed || [];
  log.closed.push({ ...ticket, closedAt: Date.now() });
  ticketConfig.saveTicketLog(log);
}

module.exports = {
  STATUSES,
  REQUEST_TYPES,
  buildSummaryEmbed,
  buildStatusSelect,
  createTicket,
  updateStatus,
  archiveTicket,
  notifyStaffLogStatusChange,
  getAssignedStaff,
};
