const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "tickets", "config.json");
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
};

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
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
