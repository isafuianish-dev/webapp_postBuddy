# Post Buddy

A lightweight API request tool for building, sending, and saving HTTP requests — right in your browser.

Post Buddy lets you construct an HTTP request (method, URL, headers, authentication, and a body payload), send it, and inspect the response — status, timing, size, body, and headers — without leaving the page. Every request you build can be bookmarked so you can fire it off again later, making it a handy pocket alternative to a full desktop API client for quick checks, debugging an endpoint, or exploring an API.

## Features

### Request builder
- **Method selector** — choose between GET, POST, PUT, PATCH, and DELETE with one click. Each method has its own icon and its own accent color that shows up throughout the app (for example, in your saved bookmarks list).
- **URL field** — type or paste the endpoint you want to call. Pressing **Enter** while focused here sends the request immediately, so you rarely need to reach for the Send button.
- **Payload / body editor** — a dedicated text area for a JSON (or any text) request body. It's only used for methods other than GET.
- **Authentication** — a built-in selector for common auth styles:
  - **None** — no Authorization header is sent.
  - **Bearer** — enter a token and Post Buddy sends `Authorization: Bearer <token>`.
  - **Basic** — enter your already-base64-encoded `user:pass` string and it's sent as `Authorization: Basic <value>`.
  - **API Key** — enter a raw value that's sent as-is in the Authorization header.
  The auth value field is disabled automatically when "None" is selected.
- **Custom headers** — add as many header name/value rows as you need with the **Add** button, and remove any row with its trash icon. There's always at least one empty row ready to fill in.
- **View as cURL** — hover or focus the small terminal-style icon next to "Request" to see a live-generated `curl` command that mirrors your current method, URL, headers, and auth. A copy button lets you grab it in one click — handy for sharing a request with a teammate or pasting into a terminal.

### Sending requests and reading responses
- **Send** — fires the request using your browser's networking. While it's in flight, the button shows a spinning icon and briefly flashes a checkmark when it completes.
- **Cancel** — while a request is in progress, this button aborts it. When nothing is in flight, the same button instead resets the form: it reloads the active bookmark's saved values, or clears the form entirely if you're not editing a bookmark.
- **Response panel** shows, once a request completes:
  - A **status badge** (color-coded — green for 2xx success, red for 4xx/5xx errors, neutral otherwise).
  - **Response time** in milliseconds and **response size** (bytes or KB).
  - A **Body** tab with the response content. JSON responses are automatically pretty-printed with indentation for readability; a copy button lets you grab the raw body text.
  - A **Headers** tab listing every response header name and value returned by the server.
  - If a request fails outright (network error, CORS block, or you cancel it), a clear error message appears in place of a body, explaining what likely happened.

### Bookmarks (saved requests)
- Click **Bookmark** to save your current method, URL, headers, payload, and auth settings as a named entry in the left sidebar. You'll be prompted to give it a name (a sensible default is suggested from the URL, e.g. `GET api.example.com/users`).
- If you've stored an auth key/token with a request, you get the option to include or exclude that secret from the saved bookmark — useful if you don't want tokens persisted.
- Click any bookmark in the sidebar to load it back into the request builder instantly.
- Each bookmark can be **renamed** or **deleted** using the small icons that appear when you hover over it (or focus it, for keyboard/touch users).
- Editing the fields of an already-selected bookmark and clicking Bookmark again **updates** that same bookmark rather than creating a duplicate.
- **Search** the sidebar by bookmark name or URL using the search box at the top.
- Method badges (GET/POST/PUT/PATCH/DELETE) are color-coded next to each bookmark so you can scan the list at a glance.

### Import & export
- **Export** your entire bookmark collection to a `postbuddy-bookmarks.json` file using the download icon at the top of the sidebar — useful for backing up your requests or moving them to another browser/computer.
- **Import** bookmarks from a JSON file using the upload icon. If any imported bookmark shares a name with one you already have, you'll be asked whether to **override** the existing one or **append** the import as a separate new bookmark.
- **Sample requests** — if you're starting from scratch, click the "sample requests" link (shown in the empty states) to load a ready-made set of example requests against the public httpbin.org test API. These cover a GET, POST/PUT/PATCH bodies, a DELETE, custom headers, Bearer auth, Basic auth, an intentional 404 error, and a deliberately slow (2 second) response — a great way to see every feature in action without needing your own API. Note: loading samples this way requires the app to be running from a server rather than opened as a local file; if that's not possible, the app tells you exactly which file to download and import manually instead.

## How to Use

1. Click **New Request** in the top-left of the sidebar to open a blank request form (or select an existing bookmark to edit it).
2. Pick a **Method**, type in a **URL**, and optionally fill in a **Payload**, **Authentication**, and any custom **Headers**.
3. Click **Send** (or press Enter in the URL field) to fire the request.
4. Review the **status, timing, and body** in the Response panel on the right; switch to the **Headers** tab to inspect response headers.
5. Click **Bookmark** to save the request for later, or adjust it and send again.
6. Use the sidebar to revisit, rename, delete, search, export, or import your saved requests at any time.

## Data & Privacy

Everything you build in Post Buddy — your bookmarks, including URLs, headers, payloads, and any auth values you choose to save — stays in your browser's local storage on your own device. Nothing is uploaded to any server other than the actual API endpoint you choose to send a request to. Clearing your browser's site data will erase your saved bookmarks, so use the Export feature if you want a backup.

## Tips & Shortcuts

- Press **Enter** while the URL field is focused to send the request instantly without touching the mouse.
- Hover (or tab to and focus) the small terminal icon above the request panel any time to preview the exact `curl` command for what you've currently built — great for double-checking headers/auth before sending, or for sharing the request with someone who prefers the command line.
- If you're saving a bookmark that includes a sensitive token, uncheck "Also save auth key with this bookmark" in the save dialog to keep that value out of your saved bookmarks (and out of any file you later export).
- A failed request that mentions CORS usually means the target server doesn't allow browser-based requests from this page — that's a server-side restriction, not something wrong with your request.
- Removing the last remaining header row automatically adds a fresh empty one back, so you always have a row ready to fill in.

## Customization

Post Buddy shares its look and feel with the other Buddy apps via a small settings panel (the gear icon in the top-right):
- **Theme** — switch between Light and Dark mode.
- **Accent color** — choose from several accent colors (Indigo, Blue, Green, Rose, Amber, Purple) to personalize buttons, highlights, and active states throughout the app.

Your theme and accent choices are remembered automatically the next time you open the app.
