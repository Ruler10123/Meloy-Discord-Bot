require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const { execute: resetExecute } = require("./commands/reset");
const startSchedule = require("./commands/start-schedule");
const endSchedule = require("./commands/end-schedule");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE_NAME || "Admin";

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const commands = [
    { name: "reset", description: "Kick all members who do not have the admin role" },
    startSchedule.data.toJSON(),
    endSchedule.data.toJSON(),
  ];

  try {
    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log(`Registered ${data.length} slash command(s)`);
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "reset") {
    await resetExecute(interaction, ADMIN_ROLE_NAME);
  } else if (interaction.commandName === "start-schedule") {
    await startSchedule.execute(interaction, ADMIN_ROLE_NAME);
  } else if (interaction.commandName === "end-schedule") {
    await endSchedule.execute(interaction, ADMIN_ROLE_NAME);
  }
});

client.login(process.env.DISCORD_TOKEN);
