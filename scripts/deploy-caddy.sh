#!/usr/bin/env bash
# Deployer Caddy-blok + CF Origin-cert til websites og reloader via ugctl.
# Idempotent. Den private nøgle skrives ALDRIG til lokal disk — den streames
# direkte via SSH til serveren og oprettes 0600 (umask 077). Dermed ingen
# /tmp-secret, ingen symlink-TOCTOU, og ingen secret der overlever en fejl.
set -euo pipefail
SERVER=websites
DOMAIN=xn--i-stdet-t1a.dk
LOCAL_CADDY="deploy/caddy-i-stoedet.dk.caddy"
CERTDIR="/etc/caddy/certs/$DOMAIN"

# Udtræk én PEM-blok (crt|key) fra 1Password-noten til stdout. Intet på disk.
pem() {
  op item get "CF Origin Cert — i-stødet.dk" --vault=udstillerguide-v3 --format=json \
  | python3 -c "
import json, sys, re
which = sys.argv[1]
note = [f['value'] for f in json.load(sys.stdin)['fields'] if f.get('id') == 'notesPlain'][0]
pat = {
    'crt': r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----',
    'key': r'-----BEGIN (?:RSA )?PRIVATE KEY-----.*?-----END (?:RSA )?PRIVATE KEY-----',
}[which]
m = re.search(pat, note, re.S)
if not m:
    sys.exit('PEM-blok ikke fundet: ' + which)
sys.stdout.write(m.group() + chr(10))
" "$1"
}

echo "→ opretter cert-dir + docroot + log på $SERVER"
ssh root@"$SERVER" "mkdir -p '$CERTDIR' '/var/www/$DOMAIN/current' /var/log/caddy"

echo "→ streamer cert + key direkte til $SERVER (ingen lokal secret-fil)"
pem crt | ssh root@"$SERVER" "umask 022; cat > '$CERTDIR/origin.crt'"
pem key | ssh root@"$SERVER" "umask 077; cat > '$CERTDIR/origin.key'"
ssh root@"$SERVER" "chown -R caddy:caddy '$CERTDIR' && chmod 600 '$CERTDIR/origin.key' && chmod 644 '$CERTDIR/origin.crt' && install -o caddy -g caddy -m 0644 /dev/null '/var/log/caddy/$DOMAIN.log' 2>/dev/null || true"

echo "→ lægger Caddy-blok"
scp -q "$LOCAL_CADDY" root@"$SERVER":"/etc/caddy/sites.d/$DOMAIN.caddy"

echo "→ validér + reload via ugctl"
ugctl caddy reload --server="$SERVER" --validate-first
echo "✓ Caddy deployet for $DOMAIN"
