# Event Tracker

Find events in a city, mark the ones you're interested in, and invite friends with a share link.

- **Frontend:** React (Vite). Only shows data and handles clicks.
- **Backend:** Node.js + Express. All logic, validation and calculations live here.
- **Database:** MongoDB (users, RSVPs, share links).
- **Events:** Ticketmaster Discovery API.

---

## 1. Setup

### What you need
- Node.js 18 or newer
- MongoDB: either installed locally, or a free MongoDB Atlas cluster
- A Ticketmaster API key

### Get the Ticketmaster API key
1. Go to https://developer.ticketmaster.com and create an account.
2. Open **My Apps**. An app is created for you automatically.
3. Copy the **Consumer Key**. That is your API key.

Free tier limits: 5000 calls per day, 5 per second. The server caches results for 5 minutes to stay under this.

> **Note:** Ticketmaster mostly lists events in the US, Canada, UK, Europe, Australia and NZ.
> Indian cities (e.g. Mumbai) will return no events. Test with cities like `New York`, `London` or `Chicago`.

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
        │   └── useEvents.js      Loads calendar + events, refreshes every 30s
        └── components/
            ├── LoginForm.jsx
            ├── ProfilePanel.jsx  Name, city, reminder settings
            ├── CitySearch.jsx
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
`GET /api/events?city=London&month=2026-10&date=2026-10-03&userId=...`

1. `ticketmaster.service` fetches all events in that city for the month (cached for 5 minutes).
2. Each event is reduced to: id, title, venue, date, time, image, ticket link.
   The server also creates the display text (`Sat, 3 Oct 2026`, `7:30 PM`).
3. `event.service` adds our data to each event:
   - `isInterested`: did this user RSVP?
   - `shareUrl`: this user's share link, if they made one
   - `friendsAttending`: the friend count (see below)
4. If `date` is given, only that day's events are returned.

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
4. The frontend refreshes every 30 seconds, so the count updates on its own.

The same browser clicking twice counts once. A different browser or device counts as a new friend.

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
| GET | `/api/events/:id` | One event |
| POST | `/api/users` | Sign in / sign up |
| GET | `/api/users/:id` | Get profile |
| PATCH | `/api/users/:id` | Update profile + reminder settings |
| POST | `/api/rsvps` | Mark interested |
| DELETE | `/api/rsvps/:eventId` | Remove interest |
| POST | `/api/share` | Create a Friend Invite link |
| GET | `/s/:code` | Open a share link (counts the click, redirects) |

Errors always look like `{ "error": "message" }` with a matching status code (400, 403, 404, ...).

---

## 5. Next steps (not included)
- **Real authentication** (passwords or Google login + JWT). Right now the `userId` is trusted.
- **Sending reminders**: a scheduled job that finds RSVPs whose event is `hoursBefore` away and emails the user.
- **Shared cache** (e.g. Redis) if you run more than one server.
- **Production**: build the client (`npm run build`), serve `client/dist`, and set `CLIENT_URL` / `SERVER_URL` to real domains.
