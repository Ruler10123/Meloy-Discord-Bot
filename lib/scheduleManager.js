const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");
const { DateTime } = require("luxon");
const { EmbedBuilder } = require("discord.js");

const COLORS = {
  event: 0x95a5a6,
  checkpoint: 0x3498db,
  deadline: 0xe74c3c,
};

let state = { channelId: null, guildId: null, jobs: [] };

function parseSchedule(tsvPath, timezone = "America/Chicago") {
  const content = fs.readFileSync(tsvPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t").map((c) => c.trim().replace(/^\uFEFF/, ""));
    if (cells.length >= 5) {
      const [dateStr, timeStr, type, title, message] = cells;
      const dt = DateTime.fromFormat(
        `${dateStr} ${timeStr}`,
        "yyyy-MM-dd HH:mm:ss",
        { zone: timezone }
      );
      if (dt.isValid) {
        rows.push({ date: dt.toJSDate(), type, title, message });
      }
    }
  }
  return rows;
}

function buildEmbed(item) {
  const color = COLORS[item.type] ?? COLORS.event;
  const isNoticeable = item.type === "checkpoint" || item.type === "deadline";
  const description = isNoticeable ? `> ${item.message}` : item.message;
  const title = item.title;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

function start(client, channel, timezone = "America/Chicago") {
  end();
  const tsvPath = path.join(__dirname, "..", "schedule.tsv");
  const now = new Date();
  const rows = parseSchedule(tsvPath, timezone).filter((r) => r.date > now);

  state.channelId = channel.id;
  state.guildId = channel.guild?.id;

  for (const row of rows) {
    const job = schedule.scheduleJob(row.date, async () => {
      try {
        const ch = await client.channels.fetch(state.channelId);
        if (ch) {
          const embed = buildEmbed(row);
          await ch.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error("Schedule post failed:", err.message);
      }
    });
    if (job) state.jobs.push(job);
  }

  return state.jobs.length;
}

function end() {
  for (const job of state.jobs) {
    try {
      job.cancel();
    } catch (_) {}
  }
  state.jobs = [];
  state.channelId = null;
  state.guildId = null;
}

function isActive() {
  return state.jobs.length > 0;
}

module.exports = { start, end, isActive, parseSchedule };
