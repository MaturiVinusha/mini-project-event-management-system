# EventSphere – Event Management Portal (Front‑End Demo)

This is a **single‑page event management UI** implemented with:

- **HTML** → overall page structure (`index.html`)
- **CSS** → modern glassmorphism‑style layout and responsive design (`styles.css`)
- **JavaScript + React** → components, state, and simple client‑side routing (`app.js`, React via CDN)

No build tools are required – you can open the app directly in a browser.

## Running the app

1. Open the project folder:
   - `c:\mini project`
2. Double‑click `index.html` or open it from your browser (`File → Open`).

If you have Node.js and npm installed and prefer a local server:

```bash
cd "c:\mini project"
npx serve .
```

Then visit `http://localhost:3000` (or the port shown) in your browser.

## Features mapped to your requirements

- **Home Page**
  - Intro hero section with event highlights.
  - Primary actions: **View Events**, **Login**, **Register**.
- **User Authentication**
  - Login, Register, and Forgot Password flows in the right‑hand panel.
  - State is stored only in memory (demo only – no real backend).
- **Dashboard**
  - Shows **user profile**, role (Attendee / Admin), and **My Events** list.
- **Event Listing**
  - All events visible with **search** and filters by **type** and **mode** (online/venue).
- **Event Details Page**
  - Name, date, time, venue / online link, description, capacity and tags.
  - **Register / Book** button.
- **Event Registration**
  - In‑app registration per event.
  - Confirmation alert + notification entry (simulated email).
- **Admin Panel**
  - Admins can **create, edit, and delete events**.
  - Compact table listing of all events with capacity stats.
- **Create / Manage Events (Admin)**
  - Form to set **name, type, date, time, venue/online, seats, tags, image URL**.
- **Notifications / Alerts**
  - Right‑hand notifications card shows success, error, and info alerts.
  - Simulated upcoming event reminders (copy only; no real scheduling).
- **Contact / Support**
  - Contact form + inline **FAQ** section on the right column.

## Notes

- This is a **front‑end only** demo: authentication, emails, and reminders are simulated.
- You can turn a user into an “admin” by checking **Login as admin** on the login form.

