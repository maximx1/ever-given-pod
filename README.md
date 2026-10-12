# ever-given-pod

This is a personal standalone self-hosted podcast and audio files hosting app.

## Getting Started

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

Build the app:

```bash
npm run build
```

Then start it:

```bash
npm start
```

You may also use yarn, pnpm, or bun to build this project.

### Docker

The repository includes a `Dockerfile` and `compose.yaml` that package the app with ffmpeg:

```bash
cp template.env.docker .env     # then set APP_URL and JWT_SECRET
docker compose up -d --build
```

See [docs/deploy.md](docs/deploy.md) for settings, storage, reverse proxy and backups, and
[docs/deploy-agent.md](docs/deploy-agent.md) for a step-by-step checklist written for an AI
assistant to follow on your server.

## Requirements

- **Node.js** to build and run the app.
- **ffmpeg and ffprobe** on the server's `PATH`. They are required for splitting long uploads into parts. Without them the app still runs, but long audio is published as a single episode.

  ```bash
  # Debian / Ubuntu
  sudo apt install ffmpeg
  # macOS
  brew install ffmpeg
  ```

  If they live somewhere else, point the app at them with `FFMPEG_PATH` and `FFPROBE_PATH`.

## Configuration

### NEXT_PUBLIC_API_BASE_URL

Set `NEXT_PUBLIC_API_BASE_URL` to your deployment's base URL. This is important — without it, RSS feed URLs won't work. Podcast clients won't be able to fetch feeds.

```bash
NEXT_PUBLIC_API_BASE_URL="https://pod.sample.com" npm run build
NEXT_PUBLIC_API_BASE_URL="https://pod.sample.com" npm start
```

`NEXT_PUBLIC_*` values are copied into the browser code by `npm run build`, so the build needs it, not just `npm start`. After changing it, build again.

### JWT_SECRET

Set `JWT_SECRET` to a long random value. It signs login sessions, so anyone who knows it can sign in as any user.

```bash
JWT_SECRET="$(openssl rand -hex 32)" npm start
```

If it is missing, the app logs a warning and uses a temporary secret, which signs everyone out each time the server restarts.

### Splitting long uploads

Podcast apps often fail to download very large files, so long audio is split into a season of parts. This is on by default and set per stream, under **Settings** on the stream page:

- **Split long uploads into parts** turns it on or off for new uploads.
- **Part length** defaults to 60 minutes. Audio longer than one and a half times that is cut into equal parts no longer than the part length. At typical audiobook bitrates a 60-minute part is roughly 30 to 55 MB.
- Audio with chapter markers is split at the chapters instead, one part per chapter.

Splitting copies the audio without re-encoding, runs in the background after the upload finishes, and removes the original file once the parts exist. Only new uploads are split; to split an episode uploaded earlier, upload its file again.

### DATA_DIR

The app keeps `db.json` and the `uploads/` folder in the folder it is started from. Set `DATA_DIR` to keep them somewhere else.

### SEED_SAMPLE_DATA

Set `SEED_SAMPLE_DATA=false` to start a new database with no accounts instead of the sample user below. Do this on any server other people can reach: the sample password is public.

### Database

The app uses lowdb (a JSON file database). It ships with a default user:

- Username: `sampleuser`
- Password: `abc123`
- Stream: `audio_books`

The password is bcrypt-hashed (10 rounds), so editing `db.json` directly won't change the password. To change credentials, either update the password hash in `db.ts` before running, or create a new user via the signup endpoint.

## Technology

- Next.js
- React
- TypeScript
- podcast (RSS feed generation)

## License

MIT licensed.