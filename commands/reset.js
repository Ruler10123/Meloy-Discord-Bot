const { PermissionFlagsBits } = require("discord.js");

const hasAdminRole = (member, adminRoleName) => {
  if (!adminRoleName) return false;
  const name = adminRoleName.toLowerCase();
  return member.roles.cache.some((r) => r.name.toLowerCase() === name);
};

const shouldExclude = (member, guild, adminRoleName) => {
  if (member.user.bot) return true;
  if (member.id === guild.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (hasAdminRole(member, adminRoleName)) return true;
  return false;
};

async function execute(interaction, adminRoleName) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
  }

  const caller = interaction.member;
  const isOwner = caller.id === guild.ownerId;
  const callerHasAdmin = hasAdminRole(caller, adminRoleName);

  if (!isOwner && !callerHasAdmin) {
    return interaction.reply({
      content: `You need the **${adminRoleName}** role to use this command.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    await guild.members.fetch({ force: true });
  } catch (err) {
    return interaction.editReply({
      content: `Failed to fetch members: ${err.message}`,
    });
  }

  const toKick = guild.members.cache.filter(
    (m) => !shouldExclude(m, guild, adminRoleName)
  );

  let kicked = 0;
  const reason = `Reset by ${interaction.user.tag} - non-admin members removed`;

  for (const [, member] of toKick) {
    try {
      await member.kick(reason);
      kicked++;
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`Failed to kick ${member.user.tag}:`, err.message);
    }
  }

  await interaction.editReply({
    content: `Kicked **${kicked}** member(s) who did not have the **${adminRoleName}** role.`,
  });
}

module.exports = { execute };
