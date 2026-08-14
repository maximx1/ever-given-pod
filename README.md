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

## Configuration

### NEXT_PUBLIC_API_BASE_URL

Set `NEXT_PUBLIC_API_BASE_URL` to your deployment's base URL. This is important — without it, RSS feed URLs won't work. Podcast clients won't be able to fetch feeds.

```bash
NEXT_PUBLIC_API_BASE_URL="https://pod.sample.com" npm run build
NEXT_PUBLIC_API_BASE_URL="https://pod.sample.com" npm start
```

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