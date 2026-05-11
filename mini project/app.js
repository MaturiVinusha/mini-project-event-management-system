// Simple single-file React app implementing the event system
// No build tools required – open index.html directly in a browser.

const { useState, useMemo, useEffect } = React;

const VIEWS = {
  HOME: "home",
  LOGIN: "login",
  REGISTER: "register",
  FORGOT: "forgot",
  DASHBOARD: "dashboard",
  EVENTS: "events",
  EVENT_DETAILS: "event-details",
  CONTACT: "contact",
  ADMIN: "admin",
};

const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
};

const ROUTE_TO_VIEW = {
  "": VIEWS.HOME,
  home: VIEWS.HOME,
  login: VIEWS.LOGIN,
  register: VIEWS.REGISTER,
  forgot: VIEWS.FORGOT,
  dashboard: VIEWS.DASHBOARD,
  events: VIEWS.EVENTS,
  "event-details": VIEWS.EVENT_DETAILS,
  contact: VIEWS.CONTACT,
  admin: VIEWS.ADMIN,
};

const VIEW_TO_ROUTE = {
  [VIEWS.HOME]: "home",
  [VIEWS.LOGIN]: "login",
  [VIEWS.REGISTER]: "register",
  [VIEWS.FORGOT]: "forgot",
  [VIEWS.DASHBOARD]: "dashboard",
  [VIEWS.EVENTS]: "events",
  [VIEWS.EVENT_DETAILS]: "event-details",
  [VIEWS.CONTACT]: "contact",
  [VIEWS.ADMIN]: "admin",
};

function getViewFromHash() {
  const rawHash = window.location.hash.replace(/^#\/?/, "").trim();
  return ROUTE_TO_VIEW[rawHash] || VIEWS.HOME;
}

async function apiRequest(path, options = {}, userId) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (userId) {
    headers["X-User-Id"] = String(userId);
  }
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error("Backend is unreachable. Please run: py server.py");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && !data.error) {
      throw new Error("Backend API not found. Please run: py server.py");
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

const seedEvents = [
  {
    id: 1,
    name: "Tech Innovators Summit 2026",
    type: "Conference",
    date: "2026-03-18",
    time: "10:00",
    location: "Bengaluru · In‑Person",
    isOnline: false,
    link: "",
    seats: 220,
    registered: 164,
    tags: ["AI", "Cloud", "Startups"],
    description:
      "A full‑day summit bringing together founders, engineers, and operators to share real stories from building the next wave of AI‑native products.",
  },
  {
    id: 2,
    name: "Design Systems Deep‑Dive",
    type: "Workshop",
    date: "2026-02-24",
    time: "16:30",
    location: "Online · Zoom",
    isOnline: true,
    link: "https://example.com/design-systems",
    seats: 80,
    registered: 72,
    tags: ["UX", "React", "Design"],
    description:
      "Hands‑on workshop to learn how to build elegant, accessible design systems with React component libraries and modern tooling.",
  },
  {
    id: 3,
    name: "Startup Demo Night",
    type: "Meetup",
    date: "2026-02-20",
    time: "18:30",
    location: "Hyderabad · In‑Person",
    isOnline: false,
    link: "",
    seats: 150,
    registered: 129,
    tags: ["Pitch", "Networking"],
    description:
      "An evening of lightning demos from early‑stage startups, followed by informal networking with founders, engineers, and investors.",
  },
  {
    id: 4,
    name: "Remote Collaboration Playbook",
    type: "Webinar",
    date: "2026-02-28",
    time: "19:00",
    location: "Online · Live",
    isOnline: true,
    link: "https://example.com/remote-playbook",
    seats: 300,
    registered: 241,
    tags: ["Remote Work", "Teams"],
    description:
      "Tactics, rituals, and tools used by high‑performing remote teams to stay aligned, ship faster, and avoid burnout.",
  },
];

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) {
    const m = Math.round(diff / 60_000);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  const h = Math.round(diff / 3_600_000);
  return `${h} hr${h === 1 ? "" : "s"} ago`;
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function App() {
  const [view, setView] = useState(() => getViewFromHash());
  const [user, setUser] = useState(null); // { name, email, role }
  const [selectedEvent, setSelectedEvent] = useState(seedEvents[0]);
  const [events, setEvents] = useState(seedEvents);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: NOTIFICATION_TYPES.INFO,
      title: "Welcome to EventSphere",
      message: "Create an account to save events and receive reminders.",
      createdAt: Date.now() - 1000 * 60 * 45,
    },
  ]);

  const isAuthed = !!user;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    apiRequest("/events")
      .then((data) => {
        const loadedEvents = data.events || [];
        if (loadedEvents.length) {
          setEvents(loadedEvents);
          setSelectedEvent(loadedEvents[0]);
        }
      })
      .catch(() => {
        // Keep seeded events when backend is unavailable.
      });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const targetView = getViewFromHash();
      if (
        (targetView === VIEWS.EVENTS ||
          targetView === VIEWS.EVENT_DETAILS ||
          targetView === VIEWS.DASHBOARD ||
          targetView === VIEWS.ADMIN) &&
        !user
      ) {
        setView(VIEWS.LOGIN);
        return;
      }
      setView(targetView);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [user]);

  useEffect(() => {
    const route = VIEW_TO_ROUTE[view] || "home";
    const expectedHash = `#/${route}`;
    if (window.location.hash !== expectedHash) {
      window.location.hash = expectedHash;
    }
  }, [view]);

  function pushNotification(type, title, message) {
    setNotifications((prev) => [
      {
        id: prev.length ? prev[0].id + 1 : 1,
        type,
        title,
        message,
        createdAt: Date.now(),
      },
      ...prev.slice(0, 15),
    ]);
  }

  function handleNavigate(nextView, extra) {
    if (
      (nextView === VIEWS.EVENTS ||
        nextView === VIEWS.EVENT_DETAILS ||
        nextView === VIEWS.DASHBOARD ||
        nextView === VIEWS.ADMIN) &&
      !user
    ) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Login required",
        "Please login first to access dashboard and events."
      );
      setView(VIEWS.LOGIN);
      return;
    }
    if (extra?.event) {
      setSelectedEvent(extra.event);
    }
    setView(nextView);
  }

  async function handleAuthLogin({ email, password, asAdmin }) {
    if (!email || !password) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Login failed",
        "Please enter both email and password."
      );
      return;
    }
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, asAdmin }),
      });
      setUser(data.user);
      setMyRegistrations(data.registrations || []);
      setEvents(data.events || events);
    } catch (error) {
      const message = error.message || "Unable to login.";
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Login failed",
        message
      );
      if (message.toLowerCase().includes("register first")) {
        alert("No account found for this email. Please register first.");
      } else if (message.toLowerCase().includes("incorrect password")) {
        alert("Wrong password. Please check and try again.");
      }
      return;
    }
    pushNotification(
      NOTIFICATION_TYPES.SUCCESS,
      "Logged in",
      `Signed in as ${email}.`
    );
    setView(VIEWS.EVENTS);
  }

  async function handleAuthRegister({ name, email, password }) {
    if (!name || !email || !password) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Registration failed",
        "Please fill in all fields."
      );
      return;
    }
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user);
      setMyRegistrations([]);
    } catch (error) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Registration failed",
        error.message || "Unable to register."
      );
      return;
    }
    pushNotification(
      NOTIFICATION_TYPES.SUCCESS,
      "Account created",
      "Welcome aboard! You can now register for events."
    );
    setView(VIEWS.EVENTS);
  }

  function handleForgotPassword({ email }) {
    if (!email) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Reset failed",
        "Please enter your registered email."
      );
      return;
    }
    pushNotification(
      NOTIFICATION_TYPES.INFO,
      "Reset link sent",
      "We’ve emailed you a secure link to reset your password (simulation)."
    );
    setView(VIEWS.LOGIN);
  }

  function handleLogout() {
    setUser(null);
    setMyRegistrations([]);
    pushNotification(
      NOTIFICATION_TYPES.INFO,
      "Signed out",
      "You’ve been logged out of EventSphere."
    );
    setView(VIEWS.HOME);
  }

  async function handleRegisterForEvent(event) {
    if (!user) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Login required",
        "Login or create an account before registering for events."
      );
      setView(VIEWS.LOGIN);
      return;
    }
    try {
      const data = await apiRequest(
        `/events/${event.id}/register`,
        { method: "POST" },
        user.id
      );
      setMyRegistrations(data.registrations || myRegistrations);
      setEvents(data.events || events);
    } catch (error) {
      pushNotification(
        NOTIFICATION_TYPES.INFO,
        "Registration update",
        error.message || "Could not register now."
      );
      return;
    }
    pushNotification(
      NOTIFICATION_TYPES.SUCCESS,
      "Registration confirmed",
      `You are registered for “${event.name}”. A confirmation email has been sent (simulation).`
    );
    alert(`Registered for "${event.name}". (Simulated email sent)`);
    setSelectedEvent(event);
    setView(VIEWS.EVENT_DETAILS);
  }

  async function handleAdminSaveEvent(eventInput) {
    if (!isAdmin) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Admin only",
        "You must be an admin to manage events."
      );
      return;
    }
    if (!eventInput.name || !eventInput.date || !eventInput.time) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Missing fields",
        "Event name, date, and time are required."
      );
      return;
    }
    try {
      if (eventInput.id) {
        const data = await apiRequest(
          `/events/${eventInput.id}`,
          {
            method: "PUT",
            body: JSON.stringify(eventInput),
          },
          user.id
        );
        setEvents(data.events || events);
      } else {
        const data = await apiRequest(
          "/events",
          {
            method: "POST",
            body: JSON.stringify(eventInput),
          },
          user.id
        );
        setEvents(data.events || events);
      }
    } catch (error) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Save failed",
        error.message || "Could not save event."
      );
      return;
    }
    pushNotification(
      NOTIFICATION_TYPES.SUCCESS,
      "Event saved",
      `“${eventInput.name}” has been saved to your event list.`
    );
    setView(VIEWS.EVENT_DETAILS);
  }

  async function handleAdminDeleteEvent(eventId) {
    if (!isAdmin) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Admin only",
        "You must be an admin to manage events."
      );
      return;
    }
    try {
      const data = await apiRequest(
        `/events/${eventId}`,
        { method: "DELETE" },
        user.id
      );
      setEvents(data.events || events);
      setMyRegistrations(
        (data.registrations || myRegistrations).filter(
          (r) => r.eventId !== eventId
        )
      );
    } catch (error) {
      pushNotification(
        NOTIFICATION_TYPES.ERROR,
        "Delete failed",
        error.message || "Could not delete event."
      );
      return;
    }
    if (selectedEvent?.id === eventId) setSelectedEvent(null);
    pushNotification(
      NOTIFICATION_TYPES.INFO,
      "Event removed",
      "The event has been removed from the listing."
    );
  }

  const registrationsWithEvents = useMemo(() => {
    return myRegistrations
      .map((reg) => ({
        ...reg,
        event: events.find((e) => e.id === reg.eventId),
      }))
      .filter((r) => !!r.event);
  }, [myRegistrations, events]);

  const isAuthView =
    view === VIEWS.LOGIN || view === VIEWS.REGISTER || view === VIEWS.FORGOT;

  if (!isAuthed && isAuthView) {
    return (
      <main>
        <div className="app-shell auth-screen-shell">
          <div className="glass-card">
            <div className="glass-card-inner">
              <div className="auth-screen-layout">
                <section className="auth-fun-panel">
                  <div className="nav-brand">
                    <div className="brand-badge">E</div>
                    <div>
                      <div className="brand-text-main">EventSphere</div>
                      <div className="brand-text-sub">
                        Sign in to unlock your event world
                      </div>
                    </div>
                  </div>
                  <h2 className="auth-fun-title">Events that feel alive ✨</h2>
                  <p className="auth-fun-subtitle">
                    Join conferences, workshops and meetups with instant
                    reminders and one-click booking.
                  </p>
                  <div className="auth-fun-grid">
                    <article className="auth-fun-card">
                      <div className="auth-fun-card-title">🎯 Pro tip</div>
                      <div className="auth-fun-card-text">
                        Save events early to get reminder alerts before seats
                        fill up.
                      </div>
                    </article>
                    <article className="auth-fun-card">
                      <div className="auth-fun-card-title">🚀 Quick start</div>
                      <div className="auth-fun-card-text">
                        Create an account in under 30 seconds and jump straight
                        to live events.
                      </div>
                    </article>
                    <article className="auth-fun-card">
                      <div className="auth-fun-card-title">🏆 Featured</div>
                      <div className="auth-fun-card-text">
                        Startup Demo Night · 20 Feb · Hyderabad
                      </div>
                    </article>
                  </div>
                </section>
                <section className="auth-form-panel">
                  <AuthCard
                    view={view}
                    setView={setView}
                    onAuthLogin={handleAuthLogin}
                    onAuthRegister={handleAuthRegister}
                    onForgotPassword={handleForgotPassword}
                  />
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="app-shell">
        <div className="glass-card">
          <div className="glass-card-inner">
            <TopNav
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
            <HeroSection onNavigate={handleNavigate} />
            <div className="layout-main">
              {isAuthed ? (
                <>
                  <LeftColumn
                    view={view}
                    setView={setView}
                    events={events}
                    selectedEvent={selectedEvent}
                    onSelectEvent={(event) =>
                      handleNavigate(VIEWS.EVENT_DETAILS, { event })
                    }
                    onRegisterForEvent={handleRegisterForEvent}
                    isAuthed={isAuthed}
                    isAdmin={isAdmin}
                    user={user}
                    registrationsWithEvents={registrationsWithEvents}
                    onAdminSaveEvent={handleAdminSaveEvent}
                    onAdminDeleteEvent={handleAdminDeleteEvent}
                  />
                  <RightColumn
                    view={view}
                    setView={setView}
                    user={user}
                    isAuthed={isAuthed}
                    isAdmin={isAdmin}
                    notifications={notifications}
                    onAuthLogin={handleAuthLogin}
                    onAuthRegister={handleAuthRegister}
                    onForgotPassword={handleForgotPassword}
                    registrationsWithEvents={registrationsWithEvents}
                  />
                </>
              ) : (
                <section className="auth-card" style={{ gridColumn: "1 / -1" }}>
                  <div className="auth-title-row">
                    <h3 className="auth-title">Welcome to EventSphere</h3>
                    <span className="tag-pill">Public view</span>
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 10 }}>
                    Please login or register to access dashboard, events, and
                    registrations.
                  </p>
                  <div className="hero-cta-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleNavigate(VIEWS.LOGIN)}
                    >
                      Login
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleNavigate(VIEWS.REGISTER)}
                    >
                      Register
                    </button>
                  </div>
                </section>
              )}
            </div>
            <div className="footer-text">
              <span>
                Built with <strong>HTML</strong>, <strong>CSS</strong>,{" "}
                <strong>JavaScript</strong> &amp; <strong>React</strong> – fully
                client‑side demo.
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopNav({ user, onNavigate, onLogout }) {
  return (
    <header className="nav">
      <div className="nav-brand">
        <div className="brand-badge">E</div>
        <div>
          <div className="brand-text-main">EventSphere</div>
          <div className="brand-text-sub">Smart event management portal</div>
        </div>
      </div>
      <div className="nav-actions">
        <span className="chip">
          <span className="pill-dot" /> Live in February cohort
        </span>
        <div className="nav-auth-buttons">
          {!user ? (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate(VIEWS.LOGIN)}
              >
                Login
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate(VIEWS.REGISTER)}
              >
                Register
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate(VIEWS.DASHBOARD)}
              >
                Dashboard
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onLogout}
                title="Logout"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onNavigate }) {
  return (
    <section className="hero">
      <div>
        <div className="hero-text-eyebrow">
          <span className="hero-badge">Event management system</span>
          <span>Plan, publish &amp; attend – all in one place.</span>
        </div>
        <h1 className="hero-title">
          Host smarter, <span>attend better</span>.
        </h1>
        <p className="hero-subtitle">
          Discover curated events, manage registrations, and run your own
          experiences with a focused dashboard for attendees and admins.
        </p>
        <div className="hero-cta-row">
          <button
            className="btn btn-primary"
            onClick={() => onNavigate(VIEWS.EVENTS)}
          >
            View Events
          </button>
          <button
            className="btn btn-outline"
            onClick={() => onNavigate(VIEWS.REGISTER)}
          >
            Get Started – Free
          </button>
        </div>
        <div className="hero-meta">
          <span>
            <strong>Real‑time</strong> registrations &amp; reminders
          </span>
          <span>·</span>
          <span>
            <strong>Admin panel</strong> to create &amp; manage events
          </span>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-visual-grid">
          <div className="hero-card">
            <div className="hero-card-title">
              <span>Upcoming events</span>
              <span className="badge-soft">This month</span>
            </div>
            <div className="hero-timeline-row">
              <span className="hero-card-label">Live sessions</span>
              <span>·</span>
              <span className="hero-card-value">4 curated picks</span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-title">
              <span>Registration health</span>
              <span className="pill-small">92% capacity</span>
            </div>
            <div className="hero-timeline-row">
              <span className="hero-card-label">Alerts</span>
              <span>·</span>
              <span>Low seats reminder auto‑enabled</span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-title">
              <span>Attendee experience</span>
              <span className="pill-small">Reminders on</span>
            </div>
            <div className="hero-timeline-row">
              <span className="hero-card-label">Email · In‑app</span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-diagram-circle">24</div>
            <div className="hero-diagram-label">hours of curated events</div>
          </div>
        </div>
        <div className="hero-glow" />
      </div>
    </section>
  );
}

function LeftColumn({
  view,
  setView,
  events,
  selectedEvent,
  onSelectEvent,
  onRegisterForEvent,
  isAuthed,
  isAdmin,
  user,
  registrationsWithEvents,
  onAdminSaveEvent,
  onAdminDeleteEvent,
}) {
  const [activeTab, setActiveTab] = useState("events");

  const effectiveTab =
    view === VIEWS.EVENT_DETAILS ? "events" : activeTab ?? "events";

  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {effectiveTab === "events"
              ? "Events"
              : effectiveTab === "dashboard"
              ? "Dashboard"
              : "Admin Panel"}
          </h2>
          <div className="section-subtitle">
            {effectiveTab === "events" &&
              "Browse, filter, and inspect upcoming events."}
            {effectiveTab === "dashboard" &&
              "Your profile, registered events, and reminders."}
            {effectiveTab === "admin" &&
              "Create and manage events as an admin."}
          </div>
        </div>
        <div className="tabs">
          <button
            className={classNames(
              "tab",
              effectiveTab === "events" && "active"
            )}
            onClick={() => {
              setActiveTab("events");
              setView(VIEWS.EVENTS);
            }}
          >
            Events
          </button>
          <button
            className={classNames(
              "tab",
              effectiveTab === "dashboard" && "active"
            )}
            onClick={() => {
              setActiveTab("dashboard");
              setView(VIEWS.DASHBOARD);
            }}
          >
            Dashboard
          </button>
          <button
            className={classNames(
              "tab",
              effectiveTab === "admin" && "active"
            )}
            onClick={() => {
              setActiveTab("admin");
              setView(VIEWS.ADMIN);
            }}
          >
            Admin
          </button>
        </div>
      </div>

      {effectiveTab === "events" && (
        <EventsSection
          events={events}
          selectedEvent={selectedEvent}
          onSelectEvent={onSelectEvent}
          onRegisterForEvent={onRegisterForEvent}
        />
      )}

      {effectiveTab === "dashboard" && (
        <DashboardSection
          user={user}
          isAuthed={isAuthed}
          registrationsWithEvents={registrationsWithEvents}
        />
      )}

      {effectiveTab === "admin" && (
        <AdminSection
          user={user}
          isAdmin={isAdmin}
          events={events}
          selectedEvent={selectedEvent}
          onAdminSaveEvent={onAdminSaveEvent}
          onAdminDeleteEvent={onAdminDeleteEvent}
        />
      )}
    </section>
  );
}

function EventsSection({
  events,
  selectedEvent,
  onSelectEvent,
  onRegisterForEvent,
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [mode, setMode] = useState("all");

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        type === "all" || event.type.toLowerCase() === type.toLowerCase();

      const matchesMode =
        mode === "all" ||
        (mode === "online" && event.isOnline) ||
        (mode === "venue" && !event.isOnline);

      return matchesSearch && matchesType && matchesMode;
    });
  }, [events, search, type, mode]);

  const activeEvent =
    selectedEvent || (filteredEvents.length ? filteredEvents[0] : null);

  return (
    <>
      <div className="search-filter-row">
        <div className="input-icon-wrapper">
          <span className="input-icon">🔍</span>
          <input
            className="input"
            placeholder="Search by name, topic, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="Conference">Conference</option>
          <option value="Workshop">Workshop</option>
          <option value="Meetup">Meetup</option>
          <option value="Webinar">Webinar</option>
        </select>
        <select
          className="select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="all">Online &amp; Venue</option>
          <option value="online">Online only</option>
          <option value="venue">Venue only</option>
        </select>
      </div>

      <div className="events-grid">
        {filteredEvents.map((event) => (
          <article
            key={event.id}
            className="event-card"
            onClick={() => onSelectEvent(event)}
          >
            <div className="event-title-row">
              <h3 className="event-title">{event.name}</h3>
              <span className="event-chip">{event.type}</span>
            </div>
            <div className="event-meta">
              <span>
                📅 {formatDisplayDate(event.date)} · {event.time}
              </span>
              <span className="event-meta-dot" />
              <span>{event.location}</span>
            </div>
            <div className="event-footer">
              <span className="pill-soft">
                <strong>{event.registered}</strong> / {event.seats} seats
              </span>
              <span className="event-register-chip">View details</span>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {activeEvent ? (
          <EventDetailsCard
            event={activeEvent}
            onRegister={() => onRegisterForEvent(activeEvent)}
          />
        ) : (
          <div className="details-card">
            <div className="details-subtext">
              No events match your filters. Try clearing the search or changing
              the type/location.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function EventDetailsCard({ event, onRegister }) {
  return (
    <article className="details-card">
      <div className="details-header-row">
        <div>
          <h3 className="details-title">{event.name}</h3>
          <div className="details-meta">
            <span>
              📅 {formatDisplayDate(event.date)} · {event.time}
            </span>
            <span>
              {event.isOnline ? "🌐 Online · " : "📍 Venue · "}
              {event.location}
            </span>
          </div>
        </div>
        <div>
          <div className="pill-soft">
            Capacity: <strong>{event.seats}</strong>
          </div>
        </div>
      </div>
      <div className="details-description">{event.description}</div>
      <div>
        <div className="details-section-title">Overview</div>
        <div className="details-meta-grid">
          <span>
            ⏱ Remaining seats:{" "}
            <strong>{Math.max(0, event.seats - event.registered)}</strong>
          </span>
          <span>
            👥 Registered: <strong>{event.registered}</strong>
          </span>
          <span>
            🏷 Type: <strong>{event.type}</strong>
          </span>
          <span>
            🧩 Tags:{" "}
            <strong>{event.tags && event.tags.length ? event.tags.join(" · ") : "—"}</strong>
          </span>
        </div>
      </div>
      {event.isOnline && event.link && (
        <div className="details-subtext">
          Join link (on approval): <strong>{event.link}</strong>
        </div>
      )}
      <div className="details-register-row">
        <div className="details-subtext">
          Register now to receive confirmation and reminder notifications before
          the event.
        </div>
        <button className="btn btn-primary btn-sm" onClick={onRegister}>
          Register / Book
        </button>
      </div>
    </article>
  );
}

function DashboardSection({ user, isAuthed, registrationsWithEvents }) {
  return (
    <section className="dashboard-card">
      <div>
        <div className="profile-block">
          <div className="avatar">
            {user?.name ? user.name[0]?.toUpperCase() : "G"}
          </div>
          <div className="profile-info-main">
            <div className="profile-name">
              {isAuthed ? user.name : "Guest user"}
            </div>
            <div className="profile-meta">
              {isAuthed ? user.email : "Create an account to personalise events"}
            </div>
            <div className="profile-stats">
              <span className="profile-stat-pill">
                Registered events:{" "}
                <strong>{registrationsWithEvents.length}</strong>
              </span>
              <span className="profile-stat-pill">
                Upcoming in next 30 days:{" "}
                <strong>
                  {
                    registrationsWithEvents.filter((r) => {
                      const date = new Date(r.event.date);
                      const now = new Date();
                      const diff = date - now;
                      return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
                    }).length
                  }
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="profile-badges">
          <span className="profile-role-pill">
            {user?.role === "admin" ? "Admin" : "Attendee"}
          </span>
          <div className="profile-quick-links">
            <button className="profile-quick-link">
              My event reminders · coming soon
            </button>
            <button className="profile-quick-link">
              Download calendar · coming soon
            </button>
          </div>
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <h3 className="section-subtitle" style={{ marginBottom: 4 }}>
          My Events
        </h3>
        <div className="my-events-list">
          {registrationsWithEvents.length === 0 ? (
            <div className="notification-empty">
              You haven&apos;t registered for any events yet. Explore the events
              section to get started.
            </div>
          ) : (
            registrationsWithEvents.map((reg) => (
              <div key={reg.eventId} className="my-event-row">
                <div className="my-event-main">
                  <span className="my-event-name">{reg.event.name}</span>
                  <span className="my-event-date">
                    {formatDisplayDate(reg.event.date)} · {reg.event.time}
                  </span>
                </div>
                <div>
                  <span className="my-event-tag">
                    Registered · {timeAgo(reg.registeredAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function AdminSection({
  user,
  isAdmin,
  events,
  selectedEvent,
  onAdminSaveEvent,
  onAdminDeleteEvent,
}) {
  const [form, setForm] = useState(() =>
    selectedEvent
      ? {
          ...selectedEvent,
          imageUrl: "",
        }
      : {
          id: null,
          name: "",
          type: "Conference",
          date: "",
          time: "",
          location: "",
          isOnline: false,
          link: "",
          seats: 100,
          tags: [],
          description: "",
          imageUrl: "",
        }
  );

  const isEditingExisting = !!form.id;

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleEditClick(event) {
    setForm({
      ...event,
      imageUrl: event.imageUrl || "",
    });
  }

  function handleNewEventClick() {
    setForm({
      id: null,
      name: "",
      type: "Conference",
      date: "",
      time: "",
      location: "",
      isOnline: false,
      link: "",
      seats: 100,
      tags: [],
      description: "",
      imageUrl: "",
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      id: form.id,
      name: form.name.trim(),
      date: form.date,
      time: form.time,
      type: form.type,
      location: form.location.trim(),
      isOnline: form.isOnline,
      link: form.link.trim(),
      seats: Number(form.seats) || 0,
      tags:
        typeof form.tags === "string"
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : form.tags || [],
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
    };
    onAdminSaveEvent(payload);
  }

  if (!isAdmin) {
    return (
      <div className="admin-card">
        <div className="alert-inline">
          <span>Restricted</span>
          <span>
            You are signed in as{" "}
            <strong>{user ? user.email : "guest"}</strong>. Log in as an admin
            to manage events.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="auth-title-row">
        <h3 className="auth-title">
          {isEditingExisting ? "Edit event" : "Create new event"}
        </h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isEditingExisting && (
            <button className="btn btn-outline btn-sm" onClick={handleNewEventClick}>
              + New Event
            </button>
          )}
          <div className="tag-pill">
            Admin: <strong>{user?.email}</strong>
          </div>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field-label">Event name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. Full‑Stack Bootcamp Demo Day"
          />
        </div>
        <div className="field-row">
          <label className="field-label">Description</label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Short and clear description for attendees"
          />
        </div>
        <div className="field-inline">
          <div className="field-row" style={{ flex: 1 }}>
            <label className="field-label">Date</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
          </div>
          <div className="field-row" style={{ width: 110 }}>
            <label className="field-label">Time</label>
            <input
              type="time"
              className="input"
              value={form.time}
              onChange={(e) => handleChange("time", e.target.value)}
            />
          </div>
          <div className="field-row" style={{ width: 120 }}>
            <label className="field-label">Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
            >
              <option value="Conference">Conference</option>
              <option value="Workshop">Workshop</option>
              <option value="Meetup">Meetup</option>
              <option value="Webinar">Webinar</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <label className="field-label">Venue / Online link</label>
          <input
            className="input"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="City & venue, or 'Online'"
          />
        </div>
        <div className="field-inline">
          <div className="field-row" style={{ flex: 1 }}>
            <label className="field-label">Is this an online event?</label>
            <select
              className="select"
              value={form.isOnline ? "yes" : "no"}
              onChange={(e) => handleChange("isOnline", e.target.value === "yes")}
            >
              <option value="no">No – physical venue</option>
              <option value="yes">Yes – online / hybrid</option>
            </select>
          </div>
          <div className="field-row" style={{ width: 110 }}>
            <label className="field-label">Total seats</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.seats}
              onChange={(e) => handleChange("seats", e.target.value)}
            />
          </div>
        </div>
        <div className="field-row">
          <label className="field-label">
            Online meeting / streaming link (optional)
          </label>
          <input
            className="input"
            value={form.link}
            onChange={(e) => handleChange("link", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="field-row">
          <label className="field-label">
            Tags (comma separated – e.g. React, Career, Networking)
          </label>
          <input
            className="input"
            value={
              typeof form.tags === "string" ? form.tags : form.tags.join(", ")
            }
            onChange={(e) => handleChange("tags", e.target.value)}
          />
        </div>
        <div className="field-row">
          <label className="field-label">Event image URL (optional)</label>
          <input
            className="input"
            value={form.imageUrl}
            onChange={(e) => handleChange("imageUrl", e.target.value)}
            placeholder="Paste a banner or cover image URL"
          />
          <div className="field-help">
            For this demo, we store only metadata – image upload is simulated via
            URL.
          </div>
        </div>
        <div className="form-footer">
          <button type="submit" className="btn btn-primary btn-sm">
            {isEditingExisting ? "Save changes" : "Create event"}
          </button>
          {isEditingExisting && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onAdminDeleteEvent(form.id)}
            >
              Delete event
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: 10 }}>
        <div className="section-subtitle" style={{ marginBottom: 4 }}>
          Existing events
        </div>
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Type</th>
                <th>Seats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.name}</td>
                  <td>{formatDisplayDate(event.date)}</td>
                  <td>{event.type}</td>
                  <td>
                    {event.registered}/{event.seats}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEditClick(event)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RightColumn({
  view,
  setView,
  user,
  isAuthed,
  isAdmin,
  notifications,
  onAuthLogin,
  onAuthRegister,
  onForgotPassword,
  registrationsWithEvents,
}) {
  const showAuth =
    view === VIEWS.LOGIN ||
    view === VIEWS.REGISTER ||
    view === VIEWS.FORGOT ||
    !isAuthed;

  return (
    <aside>
      {showAuth ? (
        <AuthCard
          view={view}
          setView={setView}
          onAuthLogin={onAuthLogin}
          onAuthRegister={onAuthRegister}
          onForgotPassword={onForgotPassword}
        />
      ) : (
        <ContactSupportCard
          onNavigateContact={() => setView(VIEWS.CONTACT)}
          registrationsWithEvents={registrationsWithEvents}
        />
      )}
      <NotificationsCard notifications={notifications} isAdmin={isAdmin} />
    </aside>
  );
}

function AuthCard({ view, setView, onAuthLogin, onAuthRegister, onForgotPassword }) {
  const [loginState, setLoginState] = useState({
    email: "",
    password: "",
    asAdmin: false,
  });
  const [registerState, setRegisterState] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [forgotState, setForgotState] = useState({ email: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const isLogin = view === VIEWS.LOGIN || view === VIEWS.HOME;
  const isRegister = view === VIEWS.REGISTER;
  const isForgot = view === VIEWS.FORGOT;

  return (
    <section className="auth-card">
      <div className="auth-title-row">
        <h3 className="auth-title">
          {isForgot
            ? "Forgot password"
            : isLogin
            ? "Welcome back"
            : "Create your account"}
        </h3>
        <div className="auth-switch-text">
          {isLogin && (
            <>
              New here?{" "}
              <button type="button" onClick={() => setView(VIEWS.REGISTER)}>
                Register
              </button>
            </>
          )}
          {isRegister && (
            <>
              Already registered?{" "}
              <button type="button" onClick={() => setView(VIEWS.LOGIN)}>
                Login
              </button>
            </>
          )}
          {isForgot && (
            <>
              Remembered it?{" "}
              <button type="button" onClick={() => setView(VIEWS.LOGIN)}>
                Back to login
              </button>
            </>
          )}
        </div>
      </div>

      {isLogin && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            onAuthLogin(loginState);
          }}
        >
          <div className="field-row">
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              value={loginState.email}
              onChange={(e) =>
                setLoginState((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
          </div>
          <div className="field-row">
            <label className="field-label">Password</label>
            <div className="password-input-wrap">
              <input
                className="input password-input"
                type={showLoginPassword ? "text" : "password"}
                value={loginState.password}
                onChange={(e) =>
                  setLoginState((s) => ({ ...s, password: e.target.value }))
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowLoginPassword((v) => !v)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                title={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>
          <div className="field-inline">
            <label className="field-label">
              <input
                type="checkbox"
                checked={loginState.asAdmin}
                onChange={(e) =>
                  setLoginState((s) => ({ ...s, asAdmin: e.target.checked }))
                }
                style={{ marginRight: 5 }}
              />
              Login as admin
            </label>
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary btn-sm">
              Login
            </button>
            <button
              type="button"
              className="link-inline"
              onClick={() => setView(VIEWS.FORGOT)}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {isRegister && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            onAuthRegister(registerState);
          }}
        >
          <div className="field-row">
            <label className="field-label">Full name</label>
            <input
              className="input"
              value={registerState.name}
              onChange={(e) =>
                setRegisterState((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Your full name"
            />
          </div>
          <div className="field-row">
            <label className="field-label">Email</label>
            <input
              className="input"
              type="email"
              value={registerState.email}
              onChange={(e) =>
                setRegisterState((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
          </div>
          <div className="field-row">
            <label className="field-label">Password</label>
            <div className="password-input-wrap">
              <input
                className="input password-input"
                type={showRegisterPassword ? "text" : "password"}
                value={registerState.password}
                onChange={(e) =>
                  setRegisterState((s) => ({ ...s, password: e.target.value }))
                }
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowRegisterPassword((v) => !v)}
                aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                title={showRegisterPassword ? "Hide password" : "Show password"}
              >
                {showRegisterPassword ? "🙈" : "👁"}
              </button>
            </div>
            <div className="field-help">
              For this demo, we keep credentials only in memory – no real
              backend.
            </div>
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary btn-sm">
              Create account
            </button>
          </div>
        </form>
      )}

      {isForgot && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            onForgotPassword(forgotState);
          }}
        >
          <div className="field-row">
            <label className="field-label">Registered email</label>
            <input
              className="input"
              type="email"
              value={forgotState.email}
              onChange={(e) =>
                setForgotState((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
            <div className="field-help">
              We&apos;ll send a reset link to your email (simulated).
            </div>
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary btn-sm">
              Send reset link
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function NotificationsCard({ notifications, isAdmin }) {
  return (
    <section className="auth-card" style={{ marginTop: 10 }}>
      <div className="auth-title-row">
        <h3 className="auth-title">Notifications &amp; alerts</h3>
        <div className="badge-dot">
          {notifications.length ? `${notifications.length} updates` : "No alerts"}
        </div>
      </div>
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            You&apos;re all caught up. You&apos;ll see success, error, and
            reminder messages here.
          </div>
        ) : (
          notifications.map((n) => (
            <article
              key={n.id}
              className={classNames(
                "notification-item",
                n.type === NOTIFICATION_TYPES.SUCCESS && "success",
                n.type === NOTIFICATION_TYPES.ERROR && "error",
                n.type === NOTIFICATION_TYPES.INFO && "info"
              )}
            >
              <div className="notification-title-row">
                <div className="notification-title">{n.title}</div>
                <div className="notification-time">
                  {timeAgo(n.createdAt)}
                </div>
              </div>
              <div className="notification-message">{n.message}</div>
            </article>
          ))
        )}
      </div>
      {isAdmin && (
        <div style={{ marginTop: 6 }}>
          <span className="pill-warning">
            Admin preview: this panel will also show upcoming event reminders
            for attendees.
          </span>
        </div>
      )}
    </section>
  );
}

function ContactSupportCard({ onNavigateContact, registrationsWithEvents }) {
  const [contactState, setContactState] = useState({
    subject: "",
    email: "",
    message: "",
  });

  function handleSubmit(e) {
    e.preventDefault();
    alert("Contact form submitted. (Demo only)");
  }

  return (
    <section className="contact-card">
      <div className="auth-title-row">
        <h3 className="auth-title">Contact &amp; support</h3>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          onClick={onNavigateContact}
        >
          Help / FAQ
        </button>
      </div>
      <div className="contact-body">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field-row">
            <label className="field-label">Subject</label>
            <input
              className="input"
              value={contactState.subject}
              onChange={(e) =>
                setContactState((s) => ({ ...s, subject: e.target.value }))
              }
              placeholder="Billing, access issue, feedback, etc."
            />
          </div>
          <div className="field-row">
            <label className="field-label">Reply‑to email</label>
            <input
              className="input"
              type="email"
              value={contactState.email}
              onChange={(e) =>
                setContactState((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="you@example.com"
            />
          </div>
          <div className="field-row">
            <label className="field-label">Message</label>
            <textarea
              className="input"
              rows="3"
              style={{ resize: "vertical", borderRadius: 10 }}
              value={contactState.message}
              onChange={(e) =>
                setContactState((s) => ({ ...s, message: e.target.value }))
              }
              placeholder="Share as much context as possible so we can help quickly."
            />
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary btn-sm">
              Send message
            </button>
          </div>
        </form>
        <div>
          <div className="section-subtitle" style={{ marginBottom: 4 }}>
            Help / FAQ
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <div className="faq-question">
                How do I receive event reminders?
              </div>
              <div className="faq-answer">
                When you register for an event, we send a confirmation and
                reminder notifications before the event starts (simulated in
                this demo).
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-question">
                Can I manage my own events?
              </div>
              <div className="faq-answer">
                Yes. Admin users can create, update, and delete events using the
                admin panel on the left.
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-question">Where are my registrations?</div>
              <div className="faq-answer">
                Your registrations are summarised in the &quot;My Events&quot;
                area inside the dashboard. In this demo they are stored only in
                memory.
              </div>
            </div>
          </div>
          {registrationsWithEvents.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span className="badge-primary">
                You&apos;re registered for {registrationsWithEvents.length}{" "}
                event
                {registrationsWithEvents.length > 1 ? "s" : ""}.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

