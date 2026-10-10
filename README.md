# RelateEverythingToThePriceOfOnions

I just built this to piss someone off
This version is set up as a small full-stack Node app:

- `index.html`, `style.css`, and `script.js` are the frontend.
- `server.js` serves the frontend and exposes `POST /api/relate`.
- Your OpenAI API key stays on the server in `.env` or your host's environment variables.

## Local setup

Install Node.js 18 or newer, then run:

```bash
npm install
cp .env.example .env
```

Open `.env` and replace `sk-your-key-here` with your real OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

Start the app:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

You should no longer see `Cannot GET /` because `server.js` now serves `index.html` at `/`.

## Test the API directly

With the server running, you can test the backend from another terminal:

```bash
curl -X POST http://localhost:3000/api/relate \
  -H "Content-Type: application/json" \
  -d '{"query":"the moon"}'
```

A working response looks like:

```json
{"raw":"CORRELATION: ..."}
```

## Deploy with a domain

Use a Node-capable host, not static-only hosting. Good beginner-friendly options include Render, Railway, Fly.io, or a VPS. Static hosts like GitHub Pages alone will not work for this server-side API-key setup.

### Render-style deployment

1. Push this project folder to GitHub.
2. Create a new Web Service on your host.
3. Connect the GitHub repo.
4. Set the runtime to Node.
5. Set the install command:

```bash
npm install
```

6. Set the start command:

```bash
npm start
```

7. Add environment variables in the host dashboard:

```text
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o-mini
```

Do not commit your real `.env` file to GitHub.

8. Deploy. Your host will give you a temporary URL first.
9. Add your custom domain in the host dashboard.
10. In your domain registrar's DNS settings, add the DNS records your host gives you, usually a `CNAME` for `www` and/or an `A`/`ALIAS`/`ANAME` record for the root domain.

## Project files

```text
index.html          frontend page
style.css           styling
script.js           frontend interactivity; calls /api/relate
server.js           Express server and OpenAI proxy
package.json        Node dependencies and start script
.env.example        template for local environment variables
server-example/     old optional proxy example; no longer needed for deployment
```

## Common errors

### Cannot GET /

This happened in the old setup because the Express server only had `POST /api/relate` and did not serve the frontend. In this version, `server.js` includes:

```js
app.use(express.static(__dirname));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
```

So `http://localhost:3000/` loads the site.

### Server is missing OPENAI_API_KEY

Create `.env` locally or add `OPENAI_API_KEY` in your deployment host's environment variable settings.

### 404 or failed fetch on deployment

Make sure you deployed this as a Node web service and not as a static site. The frontend calls `/api/relate`, which must be handled by `server.js`.
