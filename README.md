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