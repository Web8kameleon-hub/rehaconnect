# Changelog

## Unreleased — automation

- GitHub Actions builds Java and frontend assets, runs authorization checks,
  measures real HTTP latency and verifies a non-root Docker container.
- Verified releases attach commit-labelled deployment ZIPs, SHA256 checksums and
  measured benchmark reports. Release notes are generated from Git history.
- Hetzner deployment automation supports a dedicated Cloudflare Tunnel without
  changing kameleon.life Nginx. Activation requires configured SSH and application
  settings; server access is not currently verified.
- Main is the sole long-lived branch. Temporary pull-request branches are deleted
  after merge. No branch or version with failing checks is eligible for deployment.

## 2026-10-29 — persistent assistant

- Added protective-hands assistant, authenticated Lightning conversation bridge,
  response-language selection, optional dictation and speech playback.
- Added container packaging and isolated deployment checks.
- Prevented rapid concurrent saves from accepting stale record versions.

Per-release changelogs and benchmark values are generated into GitHub Releases;
this file describes source changes and never invents measured results.
