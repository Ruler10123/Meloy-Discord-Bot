const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const ticketConfig = require("../lib/ticketConfig");
const ticketManager = require("../lib/ticketManager");

const CUSTOM_IDS = {
  BUTTON: "ticket-start",
  SELECT: "ticket-type-select",
  MODAL_GENERAL: "ticket-modal-general",
  MODAL_FABLAB: "ticket-modal-fablab",
};

function buildIntakeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BUTTON)
      .setLabel("Submit a Request")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📩")
  );
}

function buildTypeSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT)
      .setPlaceholder("Choose request type…")
      .addOptions([
        { label: "General Question", value: "general", description: "General inquiries" },
        {
          label: "Fablab / Prototyping / 3D Printing",
          value: "fablab",
          description: "3D printing, prototyping, fablab requests",
        },
      ])
  );
}

function buildGeneralModal() {
  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL_GENERAL)
    .setTitle("General Question")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Short description")
          .setPlaceholder("Describe your question or request…")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1500)
          .setRequired(true)
      )
    );
}

function buildFablabModal() {
  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL_FABLAB)
    .setTitle("Fablab / Prototyping Request")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setPlaceholder("What do you need?")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1500)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("dimensions")
          .setLabel("Dimensions / Specs")
          .setPlaceholder("e.g. 10cm x 5cm x 2cm")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("quantity")
          .setLabel("Quantity")
          .setPlaceholder("e.g. 1, 5, 10")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("deadline")
          .setLabel("Deadline")
          .setPlaceholder("e.g. March 15, next week")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("material")
          .setLabel("Material / Color preferences")
          .setPlaceholder("e.g. PLA, black")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );
}

async function handleButton(interaction) {
  if (interaction.customId !== CUSTOM_IDS.BUTTON) return false;
  await interaction.reply({
    content: "**Choose your request type:**",
    components: [buildTypeSelect()],
    flags: 64, // Ephemeral
  });
  return true;
}

async function handleTypeSelect(interaction) {
  if (interaction.customId !== CUSTOM_IDS.SELECT) return false;
  const type = interaction.values[0];
  if (type === "general") {
    await interaction.showModal(buildGeneralModal());
  } else if (type === "fablab") {
    await interaction.showModal(buildFablabModal());
  }
  return true;
}

async function handleGeneralModal(interaction) {
  if (interaction.customId !== CUSTOM_IDS.MODAL_GENERAL) return false;
  const description = interaction.fields.getTextInputValue("description");
  await interaction.deferReply({ flags: 64 });

  const config = ticketConfig.loadConfig();
  if (!config.intakeChannelId) {
    return interaction.editReply({
      content: "Ticket system is not configured. Ask an admin to run `/ticket-setup`.",
    });
  }

  try {
    const { ticket, thread } = await ticketManager.createTicket(
      interaction.guild,
      config,
      "general",
      interaction.user.id,
      { description }
    );
    await interaction.editReply({
      content: `Ticket created: ${thread} — Staff have been notified.`,
    });
  } catch (err) {
    console.error("Ticket creation error:", err);
    await interaction.editReply({
      content: `Failed to create ticket: ${err.message}`,
    });
  }
  return true;
}

async function handleFablabModal(interaction) {
  if (interaction.customId !== CUSTOM_IDS.MODAL_FABLAB) return false;
  const description = interaction.fields.getTextInputValue("description");
  const dimensions = interaction.fields.getTextInputValue("dimensions") || null;
  const quantity = interaction.fields.getTextInputValue("quantity") || null;
  const deadline = interaction.fields.getTextInputValue("deadline") || null;
  const material = interaction.fields.getTextInputValue("material") || null;

  await interaction.deferReply({ flags: 64 });

  const config = ticketConfig.loadConfig();
  if (!config.intakeChannelId) {
    return interaction.editReply({
      content: "Ticket system is not configured. Ask an admin to run `/ticket-setup`.",
    });
  }

  const fablabInfo = { dimensions, quantity, deadline, material };

  try {
    const { ticket, thread } = await ticketManager.createTicket(
      interaction.guild,
      config,
      "fablab",
      interaction.user.id,
      { description, fablabInfo }
    );
    await interaction.editReply({
      content: `Ticket created: ${thread} — Staff have been notified. You can attach files in the ticket thread if needed.`,
    });
  } catch (err) {
    console.error("Ticket creation error:", err);
    await interaction.editReply({
      content: `Failed to create ticket: ${err.message}`,
    });
  }
  return true;
}

module.exports = {
  CUSTOM_IDS,
  buildIntakeButton,
  buildTypeSelect,
  buildGeneralModal,
  buildFablabModal,
  handleButton,
  handleTypeSelect,
  handleGeneralModal,
  handleFablabModal,
};
