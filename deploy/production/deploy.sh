#!/usr/bin/env bash
# Executed on the explicitly configured Hetzner host. Never touches other projects.
set -euo pipefail
release=${1:?Commit SHA required}
archive=${2:?Archive basename required}
[[ "$release" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid release SHA' >&2; exit 2; }
[[ "$archive" =~ ^[a-f0-9]{12}-[a-f0-9]{8}\.zip$ ]] || { echo 'Invalid archive name' >&2; exit 2; }
root=/opt/rehaconnect
config="$root/.env.production"
test -f "$config" || { echo 'Configure /opt/rehaconnect/.env.production before deployment.' >&2; exit 2; }
mkdir -p "$root/releases" "$root/backups"
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another RehaConnect deployment is running.' >&2; exit 2; }
cd "$root/incoming"
sha256sum --check "$archive.sha256"
target="$root/releases/$release"
test ! -e "$target" || { echo 'Release already staged; inspect state before retrying.' >&2; exit 2; }
python3 - "$archive" "$target" "$release" <<'PY'
import hashlib,json,pathlib,sys,zipfile
archive,target,release=sys.argv[1:]
target=pathlib.Path(target)
with zipfile.ZipFile(archive) as z:
    for name in z.namelist():
        path=pathlib.PurePosixPath(name.replace('\\','/'))
        if path.is_absolute() or '..' in path.parts or ':' in name:
            raise SystemExit('Unsafe archive member')
    info=json.loads(z.read('release.json').decode('utf-8-sig'))
    if info['releaseId'] != release: raise SystemExit('Release manifest mismatch')
    jar=z.read('backend/rehaconnect-api/target/rehaconnect-api-1.0.0.jar')
    if hashlib.sha256(jar).hexdigest()!=info['jarSha256']: raise SystemExit('JAR checksum mismatch')
    target.mkdir()
    z.extractall(target)
PY
export REHACONNECT_ENV_FILE="$config"
compose=(docker compose --project-name rehaconnect --env-file "$config" -f "$target/deploy/production/compose.yml")
export RELEASE_ID="$release"
"${compose[@]}" config --quiet
docker build -f "$target/deploy/production/Dockerfile" -t "rehaconnect:$release" "$target"
python3 "$target/scripts/Test-Container.py" --image "rehaconnect:$release"
previous=''
if test -L "$root/current"; then
    previous=$(readlink -f "$root/current")
    [[ "$previous" == "$root/releases/"* ]] || { echo 'Invalid previous release path' >&2; exit 2; }
fi
rollback() {
    echo 'Verification failed. Restoring the previous RehaConnect image.' >&2
    "${compose[@]}" stop rehaconnect || true
    if test -n "$previous"; then
        RELEASE_ID=$(basename "$previous") docker compose --project-name rehaconnect --env-file "$config" -f "$previous/deploy/production/compose.yml" up -d --no-build rehaconnect
    fi
}
trap rollback ERR
# Single-writer storage requires a short, explicit stop before backup/promotion.
"${compose[@]}" stop rehaconnect
if docker volume inspect rehaconnect_clinic-data >/dev/null 2>&1; then
    docker run --rm --user 0 --entrypoint tar -v rehaconnect_clinic-data:/source:ro -v "$root/backups:/backup" "rehaconnect:$release" -czf "/backup/$release-before.tgz" -C /source .
fi
"${compose[@]}" up -d --no-build rehaconnect
for attempt in $(seq 1 60); do
    container=$("${compose[@]}" ps -q rehaconnect)
    state=$(docker inspect --format '{{.State.Health.Status}}' "$container")
    if test "$state" = healthy; then break; fi
    if test "$attempt" = 60; then false; fi
    sleep 2
done
# Tunnel lifecycle is independent of the existing kameleon.life Nginx.
if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=.' "$config"; then
    "${compose[@]}" --profile cloudflare up -d --no-build cloudflared
fi
public_url=$(python3 - "$config" <<'PY'
import sys,urllib.parse
values={}
for line in open(sys.argv[1]):
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        k,v=line.strip().split('=',1);values[k]=v.strip('"\'')
url=values.get('REHACONNECT_PUBLIC_URL','')
u=urllib.parse.urlsplit(url)
if u.scheme!='https' or not u.hostname or u.username or u.password or u.query or u.fragment:
    raise SystemExit('Valid HTTPS public URL required')
print(url.rstrip('/'))
PY
)
curl --fail --silent --show-error --retry 5 --retry-delay 3 "$public_url/" >/dev/null
ln -s "$target" "$root/current-next"
mv -Tf "$root/current-next" "$root/current"
trap - ERR
printf 'Verified RehaConnect deployment: %s\n' "$release"
