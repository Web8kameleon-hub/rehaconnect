# CI/CD, releases, wiki and measured benchmarks

## Main-only workflow

`main` is the sole long-lived branch. Make changes through one temporary pull
request branch, require passing checks, merge, then delete that branch. The GitHub
repository has automatic branch deletion enabled. Release tags preserve deployed
versions without introducing additional development branches.

The previous generated Maven publication workflow targeted a nonexistent root
POM and JDK 11. It is replaced by `ci-cd.yml`, which uses the actual API POM and
JDK 21. It does not attempt unsupported Maven package publication.

## Automatic checks

Every push to main and pull request runs:

1. JavaScript syntax checks, Maven build and Java tests.
2. Isolated HTTP authorization/failure checks.
3. A real measured HTTP benchmark, recorded as JSON and Markdown with commit,
   timestamp, platform, sample count, median and P95. This is not a model benchmark
   or a production capacity guarantee.
4. Commit-labelled deployment archives and SHA256 checksums.
5. A Linux Docker build and an isolated non-root/read-only container smoke test.

Only successful verification can reach release or deployment jobs. Test reports,
archives and benchmarks are retained as GitHub Actions artifacts for 30 days.
The real Lightning/Ollama browser test remains a separate local integration check;
the hosted CI jobs do not claim they run those model or audio workflows.

## Hetzner deployment

Target: 178.105.122.238, with optional bastion 2.28.40.203. Server authentication
and final hostname must be verified before activation. The old aba-gmbh.eu origin
46.224.203.89 has been deleted; do not use it as an active deploy target.

Configure repository/environment secrets:

- `HETZNER_SSH_USER`, `HETZNER_SSH_KEY`, `HETZNER_SSH_KNOWN_HOSTS`.
- `HETZNER_BASTION_SSH_KEY` when a bastion is required.
- `WIKI_WRITE_TOKEN`: dedicated wiki write credential, never an application secret.

Configure repository variables:

- `HETZNER_SSH_HOST`: the actual target host.
- `HETZNER_BASTION_HOST` and `HETZNER_BASTION_USER` when applicable.
- `HETZNER_DEPLOY_ENABLED=true` only after target access, origin, Lightning
  integration and `/opt/rehaconnect/.env.production` have been verified.

Successful main builds then automatically deploy. Manual workflow dispatch can
also request deployment of main. Production jobs are serialized. Configure the
GitHub `production` environment with any required release approval policy.

The host needs Docker Compose, Python 3, curl, flock, and permission for the
dedicated `/opt/rehaconnect` directory. The deployment script validates archive
and JAR checksums, smoke-tests the new image, stops only RehaConnect for a data
backup, promotes it, checks health and public HTTPS, and restores the previous
application image if verification fails. Other Compose projects are untouched.

## Cloudflare without changing kameleon.life Nginx

Use a dedicated remotely managed Cloudflare Tunnel and a dedicated RehaConnect
hostname in a domain you control. Configure its published service as
`http://rehaconnect:4101`, and put `CLOUDFLARE_TUNNEL_TOKEN` only in the host's
`.env.production`. The optional Compose profile `cloudflare` runs the connector
on RehaConnect's private network. It does not edit existing Nginx or DNS records.

Cloudflare setup: https://developers.cloudflare.com/tunnel/get-started/

## Automatic release, changelog and wiki

Every successful deploy creates a commit-specific prerelease and GHCR image;
tag pushes `v*` can also publish a verified prerelease without deploying. Release
assets include ZIP, SHA256 and actual benchmark reports. Notes come from real Git
history and retain current capability limits. Failed deploys do not publish a
successful deployment release. `CHANGELOG.md` provides the source overview;
per-deploy changelogs are generated automatically as release notes.

The subsequent wiki job synchronizes `docs/wiki` and the actual benchmark using
`WIKI_WRITE_TOKEN`. GitHub requires an initial Wiki page to exist before the wiki
Git repository can be cloned. Until that one-time setup and token are present,
wiki synchronization fails explicitly and the reviewed source pages remain in
the main repository. It does not silently claim publication.

Initial page: https://github.com/Web8kameleon-hub/rehaconnect/wiki/_new
GitHub documentation: https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages
