# Ticket System Architecture

## Overview

The ticket system replaces the Google Form workflow with an in-Discord flow: intake → type selection → info collection → private ticket thread with assigned staff.

---

## Recommended Architecture

```
tickets/
├── config.json           # Channel IDs, role IDs, assignment logic
├── ticketLog.json        # Closed ticket archive (append-only)
lib/
├── ticketManager.js      # Core logic: create ticket, assign staff, update status
├── ticketConfig.js      # Load/save config, validate
commands/
├── ticket-setup.js       # Admin: configure channels, roles, assignment
├── ticket.js             # User: /ticket (alternative to button)
components/
├── ticketIntake.js       # Button + select menu for intake
├── ticketModals.js       # Modals for General vs Fablab info
├── ticketStatus.js       # Status update buttons/dropdown for staff
index.js                  # Wire interaction handlers
```

---

## Channel & Role Structure

### Channels

| Channel | Purpose | Type |
|---------|---------|------|
| `#submit-a-request` | Public intake; button + slash command; parent for ticket threads | Text |
| `#staff-log` | Private coordinator channel; new ticket notifications, summaries | Text (private) |
| `#ticket-archive` | Log of closed tickets (embeds with summary) | Text (private) |

### Roles

| Role | Purpose |
|------|---------|
| `Admin` | Full control; configure ticket system |
| `Staff` | General question tickets; 2 assigned per ticket |
| `Fablab Staff` | Fablab/prototyping tickets; 1 assigned per ticket |

### Configurable Assignment

- **General**: Pick N members from roles (e.g. `Staff`) — round-robin or random
- **Fablab**: Pick 1 member from role (e.g. `Fablab Staff`) — round-robin or random

---

## Data Flow

1. **Intake** → User clicks button or `/ticket` in `#submit-a-request`
2. **Type selection** → Bot shows select menu: General | Fablab
3. **Info collection** → Modal: short description (General) or full form (Fablab)
4. **Ticket creation** → Private thread in `#submit-a-request`, name `ticket-{type}-{seq}`
5. **Assignment** → Add requester + assigned staff; ping staff
6. **Summary** → Bot posts embed with ID, type, requester, staff, status, timestamp
7. **Status updates** → Staff use buttons/dropdown to change status
8. **Close** → Status → Completed/Denied; archive to `#ticket-archive`; optionally lock thread

---

## Status Lifecycle

```
New Request → Needs Clarification → Approved → In Progress → Ready for Pickup → Completed
                ↘ Denied / Closed
```

---

## MVP Scope

### Phase 1 (MVP)
- [x] Intake button + `/ticket` slash command
- [x] Type selection (General / Fablab)
- [x] Modals for description (General) and full form (Fablab)
- [x] Private thread creation with naming `ticket-{type}-{seq}`
- [x] Configurable staff assignment (roles in config)
- [x] Summary embed in ticket
- [x] Status update dropdown for staff
- [x] Staff log channel notification
- [x] Archive on close (embed to `#ticket-archive`)
- [x] `/ticket-setup` for admins to configure

### Phase 2 (Post-MVP)
- File attachment support in Fablab modal (Discord modal limitation: use follow-up message)
- Round-robin vs random assignment toggle
- Ticket search/query commands
- Analytics (tickets per week, avg resolution time)

---

## Implementation Plan

1. **Config & lib** — `config.json`, `ticketConfig.js`, `ticketManager.js`
2. **Intake** — Button in `#submit-a-request`, `/ticket` command, type select
3. **Modals** — General (description), Fablab (description, dimensions, quantity, deadline, material, file note)
4. **Ticket creation** — Thread creation, assignment, summary embed
5. **Status** — Dropdown component, update embed
6. **Archive** — On Completed/Denied, post to archive channel
7. **Setup** — `/ticket-setup` to set channel IDs, role names
8. **Staff log** — Post to staff channel on new ticket

---

## Setup Steps

1. **Create channels & roles**
   - `#submit-a-request` (or similar) — public intake
   - `#staff-log` — private, staff-only
   - `#ticket-archive` — private, for closed ticket logs
   - Role `Staff` — general ticket handlers
   - Role `Fablab Staff` — fablab ticket handlers

2. **Bot permissions**
   - Create Private Threads (in intake channel)
   - Send Messages, Embed Links, Attach Files
   - Manage Threads (to add members)
   - View Channel, Read Message History

3. **Configure**
   ```
   /ticket-setup
   intake_channel: #submit-a-request
   staff_log_channel: #staff-log
   archive_channel: #ticket-archive
   post_intake_button: true
   ```

4. **Copy config template** (optional)
   - Copy `tickets/config.example.json` → `tickets/config.json` if you prefer manual config
   - Otherwise `/ticket-setup` creates it
