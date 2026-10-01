# Event Tracker

Find events in a city, mark the ones you're interested in, and invite friends with a share link.

- **Frontend:** React (Vite). Only shows data and handles clicks.
- **Backend:** Node.js + Express. All logic, validation and calculations live here.
- **Database:** MongoDB (users, RSVPs, share links).
- **Events:** Ticketmaster Discovery API.
- **Chat assistant:** Google Gemini (with tool calling), run from the server.

---

## 1. Setup

### What you need
- Node.js 18 or newer
- MongoDB: either installed locally, or a free MongoDB Atlas cluster
- A Ticketmaster API key
- A Google Gemini API key (free, optional: the app runs without the chat)

### Get the Ticketmaster API key
1. Go to https://developer.ticketmaster.com and create an account.
2. Open **My Apps**. An app is created for you automatically.
3. Copy the **Consumer Key**. That is your API key.

Free tier limits: 5000 calls per day, 5 per second. The server caches results for 5 minutes to stay under this.

> **Note:** Ticketmaster mostly lists events in the US, Canada, UK, Europe, Australia and NZ.
> Indian cities (e.g. Mumbai) will return no events. Test with cities like `New York`, `London` or `Chicago`.

### Get the Gemini API key
1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key** and copy it.
3. Put it in `server/.env` as `GEMINI_API_KEY=...`.

### Get MongoDB
- **Local:** install MongoDB Community Server and use `mongodb://127.0.0.1:27017/event-tracker`
- **Atlas:** create a free cluster, add your IP under Network Access, create a database user,
  and copy the connection string (`mongodb+srv://...`).

### Run it
```bash
# Terminal 1: backend
cd server
cp .env.example .env        # Windows: copy .env.example .env
# open .env and paste your Ticketmaster key and MongoDB URI
npm install
npm run dev                 # http://localhost:5000

# Terminal 2: frontend
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173, sign in with any name + email, and search a city.

---

## 2. Folder structure

```
event-tracker/
├── README.md
├── .gitignore
├── server/                       Backend (Express)
│   ├── package.json
│   ├── .env.example              Copy to .env and fill in
│   └── src/
│       ├── index.js              Starts the server
│       ├── app.js                Express setup: middleware + routes
│       ├── config/
│       │   ├── env.js            Reads .env settings
│       │   └── db.js             Connects to MongoDB
│       ├── models/               MongoDB schemas
│       │   ├── User.js           Profile + reminder settings
│       │   ├── Rsvp.js           "User X is interested in event Y"
│       │   └── ShareLink.js      Friend Invite links + who clicked
│       ├── routes/               URL -> controller mapping
│       ├── controllers/          Read + validate request, call service, send response
│       ├── services/             Business logic
│       │   ├── ticketmaster.service.js   Calls Ticketmaster, simplifies events
│       │   ├── event.service.js          Merges events with our data, builds calendar
│       │   ├── rsvp.service.js           Add / remove RSVPs
│       │   ├── share.service.js          Share links, click tracking, friend counts
│       │   ├── realtime.service.js       Live updates to browsers (Server-Sent Events)
│       │   ├── chat.service.js           Talks to Gemini, runs the tool loop
│       │   └── chatTools.js              What the assistant may do (search, RSVP, share)
│       │   └── user.service.js           Sign in, profile, settings
│       ├── middleware/
│       │   └── errorHandler.js   Turns errors into clean JSON responses
│       └── utils/
│           ├── dates.js          All date math + calendar grid
│           ├── validators.js     Input checks
│           ├── cache.js          Small in-memory cache
│           ├── AppError.js       Error with an HTTP status
│           └── asyncHandler.js   Catches errors in async routes
└── client/                       Frontend (React + Vite)
    ├── package.json
    ├── vite.config.js            Forwards /api calls to the backend
    ├── index.html
    └── src/
        ├── main.jsx              Starts React
        ├── App.jsx               Main page, connects everything
        ├── App.css               Styles
        ├── api/client.js         Every backend call lives here
        ├── hooks/
        │   ├── useUser.js        Signed-in user
        │   ├── useEvents.js      Loads calendar + events
        │   └── useLiveUpdates.js Live connection to the server
        └── components/
            ├── LoginForm.jsx
            ├── ProfilePanel.jsx  Name, city, reminder settings
            ├── CitySearch.jsx
            ├── CategoryFilter.jsx Category dropdown
            ├── ChatPanel.jsx     Floating chat window
            ├── ChatEventItem.jsx Event inside a chat reply
            ├── EventCalendar.jsx Calendar grid
            ├── EventCard.jsx     One event + Interested / Share buttons
            └── EventList.jsx
```

### How a request flows through the backend
```
Request -> route -> controller (validate input) -> service (logic) -> model (MongoDB) / Ticketmaster
                                                                 <- JSON response
```
Each layer has one job, so adding a feature means adding one file per layer.

---

## 3. How each feature works

### Sign in
There are no passwords in this version. `POST /api/users` with name + email returns the existing
user for that email, or creates a new one. The frontend saves only the user's id in `localStorage`.

### Event feed
`GET /api/events?city=London&month=2026-10&date=2026-10-03&category=music&userId=...`

1. `ticketmaster.service` fetches all events in that city for the month (cached for 5 minutes).
   Ticketmaster returns 200 events per page, so the server asks for up to 5 pages (Ticketmaster's limit is 1000 events).
2. Each event is reduced to: id, title, venue, date, time, image, ticket link.
   The server also creates the display text (`Sat, 3 Oct 2026`, `7:30 PM`).
3. `event.service` adds our data to each event:
   - `isInterested`: did this user RSVP?
   - `shareUrl`: this user's share link, if they made one
   - `friendsAttending`: the friend count (see below)
4. If `date` is given, only that day's events are returned.

### Category filter
`GET /api/events/categories` returns the choices: All events, Music, Sports, Arts & Theatre, Film,
Attractions & other. The user picks one from the dropdown, and it is sent as `?category=` to the
event and calendar endpoints. The server checks it against the list and passes the matching
Ticketmaster segment (e.g. `Music`) as a filter.

Why it matters: in big cities, daily attraction tickets (e.g. London Eye) can fill the 1000-event limit
within a few days. Picking Music, Sports or Arts & Theatre shows real events across the whole month.

### Event calendar
`GET /api/events/calendar?city=London&month=2026-10`

The server counts events per day and builds the full grid: weeks of 7 cells, empty cells before the
1st, the month label, and the previous/next month. The React component just draws it.
Days with events are highlighted; click one to filter the list.

### Interested (RSVP)
- `POST /api/rsvps` `{ userId, eventId }` saves an RSVP. The server fetches the event from Ticketmaster
  itself (so it can't be faked) and stores its name, date and venue.
- `DELETE /api/rsvps/:eventId?userId=...` removes it, and also deletes the user's share link for it.
- A unique index stops duplicate RSVPs.

### Friend Invite system
1. After RSVPing, the user clicks **Get share link**.
   `POST /api/share` checks they RSVP'd (403 if not), then creates a link like
   `http://localhost:5000/s/k3J9_xQa`. One link per user per event.
2. A friend opens the link. `GET /s/:code` on the server:
   - gives the friend's browser a random `visitor_id` cookie (if it doesn't have one yet)
   - adds that id to the link's `clickedBy` list using `$addToSet` (no duplicates)
   - redirects to the app at `/?event=<id>`, where the event is shown under "You were invited to"
3. **Friends attending** = number of unique visitor ids that clicked any share link for that event.
   It's calculated with one MongoDB aggregation in `share.service.js`.
4. The new count is pushed to every open browser instantly (see Real-time updates).

The same browser clicking twice counts once. A different browser or device counts as a new friend.

### AI chat assistant
Click **Ask the assistant** (bottom right) and type things like:
- "Music events in London this weekend"
- "RSVP to number 2" / "Share the first one"
- "What am I interested in?"

How it works (`chat.service.js`):
1. The browser sends the message plus earlier messages to `POST /api/chat`.
2. The server sends the conversation to Gemini, along with a list of **tools** (`chatTools.js`):
   `search_events`, `get_my_events`, `rsvp_event`, `cancel_rsvp`, `create_share_link`.
3. Gemini replies either with text, or with "call search_events with city=London, startDate=...".
4. The server runs that tool using the same services and validation as the rest of the app,
   sends the result back to Gemini, and repeats (max 5 rounds) until Gemini answers in text.
5. The reply comes back with the events as cards. Gemini works out dates like "this weekend";
   the server checks every value before using it.

Gemini never touches MongoDB or Ticketmaster directly, and the API key stays on the server.
RSVPs made in the chat update the main page instantly through live updates.

### Real-time updates
The app uses **Server-Sent Events (SSE)**: each browser tab opens one long-lived connection to
`GET /api/stream?userId=...`, and the server writes a message into it whenever something changes.
No polling, no extra libraries (the browser's built-in `EventSource` handles reconnecting).

| Message | Sent to | When |
|---|---|---|
| `friends-updated` `{ eventId, friendsAttending }` | everyone | a friend clicks a share link, or a link is removed |
| `rsvp-updated` `{ eventId }` | that user's tabs | the user RSVPs or cancels (in any tab) |

The server computes the new count; the frontend just puts the number on the card.
The "● Live updates on" label shows the connection is open.

### Profile and reminder settings
`PATCH /api/users/:id` updates name, home city, `reminders.enabled` and
`reminders.hoursBefore` (1 to 168 hours). The server validates every field.
These are saved settings only; nothing sends reminders yet (see Next steps).

---

## 4. API summary

| Method | URL | What it does |
|---|---|---|
| GET | `/api/events` | Events for a city + month (or one day) |
| GET | `/api/events/calendar` | Calendar grid with event counts |
| GET | `/api/events/categories` | Category choices for the dropdown |
| GET | `/api/events/:id` | One event |
| POST | `/api/users` | Sign in / sign up |
| GET | `/api/users/:id` | Get profile |
| PATCH | `/api/users/:id` | Update profile + reminder settings |
| POST | `/api/rsvps` | Mark interested |
| DELETE | `/api/rsvps/:eventId` | Remove interest |
| POST | `/api/share` | Create a Friend Invite link |
| GET | `/api/stream` | Live updates (Server-Sent Events) |
| POST | `/api/chat` | Ask the AI assistant |
| GET | `/s/:code` | Open a share link (counts the click, redirects) |

Errors always look like `{ "error": "message" }` with a matching status code (400, 403, 404, ...).

---

## 5. Next steps (not included)
- **Real authentication** (passwords or Google login + JWT). Right now the `userId` is trusted.
- **Sending reminders**: a scheduled job that finds RSVPs whose event is `hoursBefore` away and emails the user.
- **Shared cache and message bus** (e.g. Redis) if you run more than one server, so caches and live updates are shared.
- **Production**: build the client (`npm run build`), serve `client/dist`, and set `CLIENT_URL` / `SERVER_URL` to real domains.
