const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "tickets", "config.json");
const EXAMPLE_PATH = path.join(__dirname, "..", "tickets", "config.example.json");
const LOG_PATH = path.join(__dirname, "..", "tickets", "ticketLog.json");

const DEFAULT_CONFIG = {
  intakeChannelId: "",
  staffLogChannelId: "",
  ticketArchiveChannelId: "",
  generalStaffRoleName: "Staff",
  generalStaffCount: 2,
  fablabStaffRoleName: "Fablab Staff",
  fablabStaffCount: 1,
  assignmentMode: "roundRobin",
  postIntakeButton: true,
};

function ensureConfigExists() {
  if (fs.existsSync(CONFIG_PATH)) return;
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const example = fs.readFileSync(EXAMPLE_PATH, "utf8");
    fs.writeFileSync(CONFIG_PATH, example);
  } catch {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function loadConfig() {
  ensureConfigExists();
  let config = { ...DEFAULT_CONFIG };
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf8");
    config = { ...config, ...JSON.parse(data) };
  } catch {
    // fallback to defaults
  }
  // Env vars override file (so .env can set once and forget)
  if (process.env.TICKET_INTAKE_CHANNEL_ID) config.intakeChannelId = process.env.TICKET_INTAKE_CHANNEL_ID;
  if (process.env.TICKET_STAFF_LOG_CHANNEL_ID) config.staffLogChannelId = process.env.TICKET_STAFF_LOG_CHANNEL_ID;
  if (process.env.TICKET_ARCHIVE_CHANNEL_ID) config.ticketArchiveChannelId = process.env.TICKET_ARCHIVE_CHANNEL_ID;
  if (process.env.TICKET_GENERAL_STAFF_ROLE) config.generalStaffRoleName = process.env.TICKET_GENERAL_STAFF_ROLE;
  if (process.env.TICKET_GENERAL_STAFF_COUNT) config.generalStaffCount = parseInt(process.env.TICKET_GENERAL_STAFF_COUNT, 10) || 2;
  if (process.env.TICKET_FABLAB_STAFF_ROLE) config.fablabStaffRoleName = process.env.TICKET_FABLAB_STAFF_ROLE;
  if (process.env.TICKET_FABLAB_STAFF_COUNT) config.fablabStaffCount = parseInt(process.env.TICKET_FABLAB_STAFF_COUNT, 10) || 1;
  if (process.env.TICKET_ASSIGNMENT_MODE) config.assignmentMode = process.env.TICKET_ASSIGNMENT_MODE;
  return config;
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadTicketLog() {
  try {
    const data = fs.readFileSync(LOG_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return { nextId: 1, tickets: [], closed: [] };
  }
}

function saveTicketLog(log) {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function getNextTicketId(log) {
  const next = log.nextId || 1;
  log.nextId = next + 1;
  return next;
}

module.exports = {
  loadConfig,
  saveConfig,
  loadTicketLog,
  saveTicketLog,
  getNextTicketId,
  DEFAULT_CONFIG,
};
