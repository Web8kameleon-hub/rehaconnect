# Automation

Every pull request and push to main runs build, Java tests, authorization checks,
actual loopback HTTP benchmarks and a non-root Docker smoke test. Reports and
commit-labelled archives are retained as workflow artifacts.

When Hetzner access is configured and `HETZNER_DEPLOY_ENABLED=true`, successful
main builds automatically deploy. Each successful deployment publishes a release
with an automatically generated changelog, measured benchmarks and checksummed
artifacts, then synchronizes this wiki using a dedicated wiki token.

Only main is long-lived. Pull-request branches are temporary and deleted after
merge. Release tags identify versions and do not create long-lived branches.

The wiki must have an initial page created on GitHub and `WIKI_WRITE_TOKEN`
configured. Until then the reviewed source pages are available in `docs/wiki`.
