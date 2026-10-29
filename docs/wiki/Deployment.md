# Deployment

Target hosting is Hetzner with a dedicated RehaConnect Compose project and data
volume. The supplied aba-gmbh.eu DNS points to deleted server 46.224.203.89 and
must be corrected before use. The confirmed reachable entry host is 2.28.40.203
(ARM), running a separate Lightning test stack. Port 22 of target 178.105.122.238
is reachable from that host; target authentication and the final RehaConnect
hostname must be confirmed before enabling production deployment.

Cloudflare Tunnel can route a dedicated hostname to `http://rehaconnect:4101`
without changing the existing kameleon.life Nginx configuration. Tunnel tokens
remain on the deployment host. No public model or Longo port is required.

The deployment script verifies checksums, smoke-tests the candidate image, stops
only RehaConnect briefly for a consistent data backup, promotes it and rolls back
the application image on verification failure. It never removes the data volume.

See [deployment setup](https://github.com/Web8kameleon-hub/rehaconnect/blob/main/deploy/production/README.md).
