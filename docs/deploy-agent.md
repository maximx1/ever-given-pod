# Deployment instructions for an AI assistant

You are deploying **Ever Given Pod** on a Linux server with Docker Compose. Follow the steps
in order. Each step ends with a **Check**; do not go on until it passes.

This setup has not been run on a server before, and the image has never been built with
Docker. If a check fails, stop, show the owner the command, its output and the last 100
lines of `docker compose logs app`, and wait. Do not improvise around a failure.

## Rules

1. **Never run `docker compose down -v`, `docker volume rm`, or `docker system prune
   --volumes`.** The volume `ever-given-pod_data` holds the database and every uploaded
   file. Losing it loses everything.
2. **Do not edit the application's code, `Dockerfile` or `compose.yaml`.** Configuration
   goes in `.env` only. If one of those files seems wrong, report it.
3. **Do not touch nginx.** The owner is handling that separately. Step 8 tells you what to
   report so they can.
4. **Do not print the contents of `.env` back or commit it.** It holds the secret that signs
   logins. It is ignored by git; leave it that way.
5. Do not expose port 3000 to the network. It stays on `127.0.0.1`; nginx is the only way in.
6. Use `sudo` only where a step says so.

## What you need from the owner first

Ask for these if you were not given them:

| Name | Meaning | Example |
| --- | --- | --- |
| `DOMAIN` | The address the app will be opened at, without `https://` | `pod.mysite.com` |
| `APP_DIR` | Where the code goes | `/opt/ever-given-pod` |
| `BACKUP_DIR` | Where nightly database copies go | `/var/backups/ever-given-pod` |
| `BRANCH` | The branch to deploy. `main` unless the owner says otherwise | `main` |
| `DATA_MOUNT` | Optional. A folder for the database and uploads, if they should not live in a Docker volume | `/srv/ever-given-pod` |

Uploads are audiobooks and podcasts, often hundreds of megabytes each. Ask the owner
whether the default Docker volume (on the disk Docker uses, usually `/var/lib/docker`) has
the room, or whether they want `DATA_MOUNT`.

The domain does not have to work yet, **but it must be final**. It is built into the image
in step 4, and every feed and file link uses it.

## Step 1: Docker is installed and starts at boot

```bash
docker --version && docker compose version && docker buildx version
```

If any of the three is missing, install them. On Arch:

```bash
sudo pacman -S --needed docker docker-compose docker-buildx
```

On Debian or Ubuntu, install Docker Engine with the compose and buildx plugins from
Docker's own repository, following docs.docker.com for that distribution.

```bash
sudo systemctl enable --now docker
```

**Check:** all three version commands print a version, and

```bash
systemctl is-enabled docker && systemctl is-active docker
```

prints `enabled` and `active`. `enabled` is what brings the app back after a reboot.

If `docker` commands fail with "permission denied" on the socket, either prefix them with
`sudo` for the rest of this document or ask the owner whether to add the user to the
`docker` group.

## Step 2: Get the code

```bash
sudo mkdir -p APP_DIR && sudo chown "$USER": APP_DIR
git clone --branch BRANCH https://github.com/maximx1/ever-given-pod.git APP_DIR
```

If `APP_DIR` already holds a clone, update it instead:

```bash
git -C APP_DIR pull --ff-only origin BRANCH
```

Run every later command from inside `APP_DIR`.

**Check:** `ls` shows `compose.yaml`, `Dockerfile`, `template.env.docker` and `deploy/`.

## Step 3: Configure

```bash
cp -n template.env.docker .env
chmod 600 .env
```

Set the address. It must be exactly as it will appear in a browser: `https://`, the
domain, no trailing slash, no path.

```bash
sed -i 's|^APP_URL=.*|APP_URL=https://DOMAIN|' .env
```

Generate the login secret straight into the file, without showing it. Do this **once**: a
new secret signs everybody out. Skip it if `JWT_SECRET=` already has a value.

```bash
grep -q '^JWT_SECRET=.\+' .env || sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
```

If the owner gave a `DATA_MOUNT`, create it owned by user id 1000 (the user the app runs
as inside the container) and record it:

```bash
sudo mkdir -p DATA_MOUNT && sudo chown 1000:1000 DATA_MOUNT
echo 'DATA_MOUNT=DATA_MOUNT' >> .env
```

Make sure nothing else is using the port:

```bash
ss -ltn | grep ':3000 ' || echo "3000 is free"
```

If it is taken, add `APP_PORT=3001` (or another free port) to `.env` and use that number
wherever this document says 3000.

**Check:** both of these print `1`:

```bash
grep -c '^APP_URL=https://[^/]*$' .env
grep -c '^JWT_SECRET=[0-9a-f]\{64\}$' .env
```

## Step 4: Build and start

```bash
docker compose up -d --build
```

The first build downloads a Node image, the dependencies and ffmpeg, then builds the app;
allow ten minutes.

Wait for it to report healthy (up to two minutes):

```bash
for i in $(seq 1 24); do s=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)"); echo "$s"; [ "$s" = healthy ] && break; sleep 5; done
```

**Check:** the last line printed is `healthy`, and all of these succeed:

```bash
curl -fsS http://127.0.0.1:3000/api/streams/random
```

prints `[]` (an empty list: the server answers and has read its database).

```bash
curl -fsS -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:3000/
```

prints a line starting `200 text/html`.

```bash
docker compose exec -T app sh -c 'ffmpeg -version | head -1; ffprobe -version | head -1'
```

prints an `ffmpeg version …` line and an `ffprobe version …` line. Long uploads cannot be
split into parts without them.

```bash
docker compose exec -T app printenv NEXT_PUBLIC_API_BASE_URL
```

prints `https://DOMAIN` exactly.

```bash
docker compose exec -T app sh -c 'touch /app/should-fail 2>&1; touch /data/.write-test && rm /data/.write-test && echo data-writable'
```

prints a "Read-only file system" error for the first file, then `data-writable`.

If the container keeps restarting or never becomes healthy, stop here and report
`docker compose ps` and `docker compose logs app --tail 100`.

## Step 5: The data survives the container

The database is the file `/data/db.json` inside the container and uploads are in
`/data/uploads`. Both are kept in the Docker volume `ever-given-pod_data` (or in
`DATA_MOUNT`). Replacing the container must not replace them.

```bash
docker compose exec -T app sh -c 'ls -l /data; echo survives > /data/.recreate-test'
docker compose up -d --force-recreate app
```

Wait for `healthy` as in step 4, then:

```bash
docker compose exec -T app sh -c 'cat /data/.recreate-test && rm /data/.recreate-test; ls -l /data'
```

**Check:** it prints `survives`, and `db.json` is still listed.

## Step 6: It comes back by itself

`compose.yaml` already sets `restart: unless-stopped`. Confirm it, then prove it.

```bash
docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$(docker compose ps -q app)"
```

must print `unless-stopped`.

Now simulate a crash. Use the host's `kill` on the container's main process. Do **not** use
`docker kill` or `docker stop` for this test: Docker treats those as "stopped on purpose"
and deliberately does not restart.

```bash
c=$(docker compose ps -q app); sudo kill -9 "$(docker inspect -f '{{.State.Pid}}' "$c")"
```

Wait for `healthy` as in step 4, then:

```bash
docker inspect -f '{{.RestartCount}} {{.State.Health.Status}}' "$(docker compose ps -q app)"
```

**Check:** it prints a restart count of `1` or more followed by `healthy`.

| Event | Result |
| --- | --- |
| The server process crashes or is killed | Docker starts it again within seconds |
| The machine reboots | Docker starts at boot (step 1) and starts the container |
| Someone runs `docker compose stop` | It stays stopped until `docker compose start`. That is intended |
| It is running but frozen, not answering | The health check turns `unhealthy`. Docker reports that but does not act on it |
| It restarts while a long upload is being split | The split starts again the next time anyone opens a stream page, not by itself |

## Step 7: Nightly backups

```bash
sudo mkdir -p BACKUP_DIR && sudo chown "$USER": BACKUP_DIR
deploy/backup.sh BACKUP_DIR
```

**Check:** it prints `Saved BACKUP_DIR/db-<date>-<time>.json` and that file exists and is
not empty.

This copies the database only: accounts, streams, episode details. It does **not** copy
the audio and image files, which can be many gigabytes. `deploy/backup.sh --uploads
BACKUP_DIR` archives those too. Ask the owner how they want uploads backed up before
scheduling that; do not schedule it on your own.

Schedule the database copy. Create `/etc/systemd/system/pod-backup.service` (replace
`APP_DIR`, `BACKUP_DIR` and `USERNAME` with the real values; `USERNAME` is the user who can
run `docker`):

```ini
[Unit]
Description=Back up the Ever Given Pod database
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=USERNAME
WorkingDirectory=APP_DIR
ExecStart=APP_DIR/deploy/backup.sh BACKUP_DIR
```

and `/etc/systemd/system/pod-backup.timer`:

```ini
[Unit]
Description=Nightly Ever Given Pod database backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now pod-backup.timer
sudo systemctl start pod-backup.service
```

**Check:** `systemctl is-enabled pod-backup.timer` prints `enabled`, and a second
`db-*.json` file has appeared in `BACKUP_DIR`.

Tell the owner: these copies are on the same server as the app. They protect against a bad
update or a mistake, not against losing the server. They also pile up; nothing deletes old
ones.

## Step 8: Report to the owner

Stop here and report. The owner sets up DNS and nginx; you do not. Tell them:

- The app is listening on `http://127.0.0.1:3000` on this server (or the port chosen in
  step 3), reachable only from the server itself.
- nginx needs a site for `DOMAIN` with a TLS certificate that forwards everything to that
  address. Uploads are hundreds of megabytes and take minutes, so nginx's default limits
  (1 MB, 60 seconds) will break them. The `location` block must be:

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

  Plain `http://DOMAIN` should redirect to `https://`.
- The site must be served over `https://`. Signing in does not work over plain `http://`:
  the login cookie is marked secure.
- If nginx runs inside Docker rather than on the host, `127.0.0.1` will not reach the app
  from it. Say so; that needs a decision from the owner.
- **Anyone who finds the address can create an account and upload files.** The app has no
  setting to close sign-ups. The owner should know this before the domain goes live.
- A new database starts with no accounts. The sample account from the README is not created.
- The results of steps 4 to 7, including the restart count from the crash test.

## Step 9: After nginx is in place

When the owner says the domain is live:

```bash
curl -fsS https://DOMAIN/api/streams/random
```

**Check:** prints `[]` (or a list of streams), with no certificate warning.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://DOMAIN/api/login -H 'Content-Type: application/json' -d '{"identifier":"sampleuser","password":"abc123"}'
```

**Check:** prints `401`. The sample account with the published password does not exist.

Then the owner opens `https://DOMAIN` in a browser, signs up, creates a stream and uploads
one episode. Ask them to confirm three things:

- The episode plays in the browser.
- The stream's **RSS Feed** button gives an address that starts with `https://DOMAIN/`.
- That feed opens in a podcast app and the episode downloads there.

If feed or file links start with anything other than `https://DOMAIN`, `APP_URL` in `.env`
is wrong. Fix it and run `docker compose up -d --build`. The rebuild is required: the
address is built into the image.

## Updating later

```bash
deploy/backup.sh BACKUP_DIR
git pull --ff-only origin BRANCH
docker compose up -d --build
```

Wait for `healthy` as in step 4. If it does not become healthy, report the logs; the backup
just taken is the way back for the database, and the uploads were not touched.

Do this when nobody is uploading: a restart cuts off an upload in progress.

## If something is wrong

| Symptom | Cause |
| --- | --- |
| `Set APP_URL in .env …` or `Set JWT_SECRET in .env …` when starting | `.env` is missing or that line is empty (step 3) |
| The build stops at `Set the build argument NEXT_PUBLIC_API_BASE_URL …` | Same: `APP_URL` is empty |
| `compose build requires buildx` | `docker-buildx` is not installed (step 1) |
| Container restarts in a loop | Read `docker compose logs app`. Report it |
| `EACCES` or "permission denied" on `/data` in the logs | `DATA_MOUNT` is not owned by user id 1000 (step 3) |
| Feed or file links point at the wrong address | `APP_URL` was wrong or changed without `--build` (step 9) |
| Signs in, then is signed out on the next page | The site is being opened over `http://`. It must be `https://` |
| Everyone was signed out after a restart | `JWT_SECRET` changed or is missing from `.env` |
| Upload fails with `413 Request Entity Too Large` | nginx is missing `client_max_body_size 0;` (step 8) |
| Upload fails after about a minute, or with `504` | nginx is missing the timeouts in step 8 |
| A long upload stays one episode instead of parts | ffmpeg is missing (step 4), or splitting is switched off in the stream's settings |
| `502 Bad Gateway` from nginx | The container is not running or not on the port nginx forwards to: `docker compose ps` |

The longer explanation of every part is in `docs/deploy.md`.
