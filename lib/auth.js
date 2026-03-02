function hasAdminRole(member, adminRoleName) {
  if (!adminRoleName) return false;
  const name = adminRoleName.toLowerCase();
  return member.roles.cache.some((r) => r.name.toLowerCase() === name);
}

function canUseAdminCommand(member, guild, adminRoleName) {
  if (member.id === guild.ownerId) return true;
  return hasAdminRole(member, adminRoleName);
}

module.exports = { hasAdminRole, canUseAdminCommand };
