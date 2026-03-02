require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const { execute: resetExecute } = require("./commands/reset");
const startSchedule = require("./commands/start-schedule");
const endSchedule = require("./commands/end-schedule");
const ticketCommand = require("./commands/ticket");
const ticketSetup = require("./commands/ticket-setup");
const ticketStatusCommand = require("./commands/ticket-status");
const ticketIntake = require("./components/ticketIntake");
const ticketStatus = require("./components/ticketStatus");

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
    ticketCommand.data.toJSON(),
    ticketSetup.data.toJSON(),
    ticketStatusCommand.data.toJSON(),
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
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "reset") {
      await resetExecute(interaction, ADMIN_ROLE_NAME);
    } else if (interaction.commandName === "start-schedule") {
      await startSchedule.execute(interaction, ADMIN_ROLE_NAME);
    } else if (interaction.commandName === "end-schedule") {
      await endSchedule.execute(interaction, ADMIN_ROLE_NAME);
    } else if (interaction.commandName === "ticket") {
      await ticketCommand.execute(interaction);
    } else if (interaction.commandName === "ticket-setup") {
      await ticketSetup.execute(interaction, ADMIN_ROLE_NAME);
    } else if (interaction.commandName === "ticket-status") {
      await ticketStatusCommand.execute(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    if (await ticketIntake.handleButton(interaction)) return;
  }

  if (interaction.isStringSelectMenu()) {
    if (await ticketIntake.handleTypeSelect(interaction)) return;
    if (await ticketStatus.handleStatusSelect(interaction)) return;
  }

  if (interaction.isModalSubmit()) {
    if (await ticketIntake.handleGeneralModal(interaction)) return;
    if (await ticketIntake.handleFablabModal(interaction)) return;
  }
});

client.login(process.env.DISCORD_TOKEN);
