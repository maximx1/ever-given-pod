# Deploying with Docker

One image runs the whole app and includes ffmpeg, so long uploads can be split into parts
without installing anything on the server. Docker Compose wires up the settings and the
storage.

If an AI assistant is doing the deployment for you, give it
[deploy-agent.md](deploy-agent.md) instead: the same steps as a checklist, each with a
check to pass before moving on.

**Not yet run on a server.** The image's contents were assembled and run by hand (see
"What has been checked" at the end), but `docker build` itself has never run. Expect to
fix something on the first deployment.

## Quick start

```bash
git clone https://github.com/maximx1/ever-given-pod.git && cd ever-given-pod
cp template.env.docker .env
```

Edit `.env` and set the two required values:

```
APP_URL=https://pod.example.com
JWT_SECRET=<output of: openssl rand -hex 32>
```

```bash
docker compose up -d --build
```

The app is now on `http://127.0.0.1:3000`, reachable only from the server itself. Put a
reverse proxy with HTTPS in front of it (below).

## Settings

All of them go in `.env`, next to `compose.yaml`.

| Setting | Required | What it does |
| --- | --- | --- |
| `APP_URL` | Yes | The address the app is opened at: `https://`, the domain, no trailing slash. Becomes `NEXT_PUBLIC_API_BASE_URL` |
| `JWT_SECRET` | Yes | Signs login sessions. Anyone who knows it can sign in as any user. Changing it signs everyone out |
| `APP_PORT` | No | Port on the server. Default `3000` |
| `APP_BIND` | No | Who can reach that port. Default `127.0.0.1` (this machine only) |
| `DATA_MOUNT` | No | A host folder for the database and uploads instead of a Docker volume. Must be writable by user id 1000 |
| `SEED_SAMPLE_DATA` | No | `true` creates the README's sample account in a new database. Default `false` under Docker |
| `APP_DOMAIN` | No | Domain for the bundled Caddy proxy |

### The address is built into the image

Next.js copies `NEXT_PUBLIC_*` values into the browser code when the app is **built**, not
when it starts. Compose passes `APP_URL` to the build for that reason. Two consequences:

- After changing `APP_URL`, run `docker compose up -d --build`. A plain restart keeps the
  old address.
- An image built for one address cannot be reused for another.

Feed links and file links are made from this address. If it is wrong, the site may look
fine in a browser while podcast apps fail to download anything.

## Where the data lives

Everything the app stores is in `/data` inside the container:

- `/data/db.json`: accounts, streams, episode details
- `/data/uploads/`: audio and images
- `/data/cache/images/`: resized copies of the images, made the first time each size is
  asked for. Safe to delete at any time and not worth backing up
- `/data/db.json.v<n>.bak`: the database as it was before an update changed its format

When the app starts it brings `db.json` up to date for the new version (keeping the old copy
as above), then once a day removes uploads that nothing points at any more. A file is only
removed once it is a day old, so uploads still in progress are never touched.

By default that is the Docker volume `ever-given-pod_data`. It survives rebuilding and
replacing the container. It does **not** survive `docker compose down -v` or
`docker volume rm`.

Audiobooks are large. If the disk Docker uses is small, set `DATA_MOUNT` to a folder on a
bigger one:

```bash
sudo mkdir -p /srv/ever-given-pod && sudo chown 1000:1000 /srv/ever-given-pod
echo 'DATA_MOUNT=/srv/ever-given-pod' >> .env
```

Outside Docker the same thing is the `DATA_DIR` environment variable; without it the app
keeps `db.json` and `uploads/` in the folder it is started from, as before.

## Reverse proxy and HTTPS

The app must be served over HTTPS: the login cookie is marked secure, so signing in over
plain `http://` does not stick.

Uploads are hundreds of megabytes and take minutes. A proxy's default limits will cut them
off.

### nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Large, slow uploads: no size limit, stream them to the app, wait up to an hour.
    client_max_body_size 0;
    proxy_request_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Large downloads: do not spool episodes to nginx's temp folder first.
    proxy_buffering off;
}
```

### Bundled Caddy

If nothing else on the server uses ports 80 and 443, Compose can run Caddy, which gets and
renews the certificate by itself:

```bash
echo 'APP_DOMAIN=pod.example.com' >> .env
docker compose --profile caddy up -d
```

Caddy has no upload size limit and does not time out a slow upload.

## Backups

```bash
deploy/backup.sh /var/backups/ever-given-pod            # the database
deploy/backup.sh --uploads /var/backups/ever-given-pod  # and an archive of every upload
```

The database copy is small and safe to take while the app runs. The uploads archive is as
big as your library; most people will prefer to back up the uploads folder with whatever
they already use for large files. Copies kept on the same server do not protect against
losing the server.

To restore: stop the app, put `db.json` (and `uploads/`) back into the volume or
`DATA_MOUNT`, start it again.

## Updating

```bash
deploy/backup.sh /var/backups/ever-given-pod
git pull
docker compose up -d --build
```

A restart cuts off any upload in progress. A split that was running resumes the next time
someone opens a stream page.

## Things to know before going live

- **Sign-ups cannot be closed.** Anyone who finds the address can create an account and
  upload files to your disk. There is no setting for this yet.
- **No sample account.** Under Docker a new database starts empty; sign up to create the
  first account. (Run from source, a new database still gets the README's sample account,
  whose password is public.)
- **There is no password reset.** A forgotten password means editing `db.json`.
- **Sessions last an hour** and are renewed while the site is open.

## What is in the image

- Debian (bookworm) with Node 22. `bcrypt` and `sharp` are installed inside the image, for
  its platform, from prebuilt binaries; no compiler is involved.
- `ffmpeg` and `ffprobe` from Debian's package.
- The production build and runtime dependencies only.
- Runs as the unprivileged `node` user (id 1000), with a read-only filesystem apart from
  `/data`, Next's cache and `/tmp`.
- A health check that asks the app for its public stream list, which also proves it can
  read the database.

## What has been checked

Done by hand on a Mac, without Docker, by laying the files out as the image does:

- A production build with the address set, started with runtime dependencies only and the
  app folder made read-only, with `DATA_DIR` pointing elsewhere.
- That start first failed because `next.config.ts` needs TypeScript, which is a dev
  dependency. The Dockerfile now compiles it to JavaScript during the build.
- A new database started empty and the sample login was refused.
- Sign up, sign in, create a stream, upload an episode with its image: files landed in the
  data folder and were served back, including a resized image.
- A 95-minute upload was split into two parts by ffmpeg.
- Feed and file links used the configured address.

Not checked:

- `docker build` and `docker compose up` themselves, on any machine.
- The ffmpeg that Debian installs (the check above used the Mac's).
- The read-only container, dropped capabilities and the tmpfs mounts as Docker applies them.
- Ownership of a fresh Docker volume by the `node` user.
- The health check, restart behaviour, `deploy/backup.sh` and the Caddy profile.
- Uploads of real size through nginx.
