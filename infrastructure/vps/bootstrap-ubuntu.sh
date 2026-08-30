#!/usr/bin/env bash
set -Eeuo pipefail

VROMPT_USER="${VROMPT_USER:-vrompt}"
SSH_PORT="${SSH_PORT:-22}"
SWAP_SIZE="${SWAP_SIZE:-2G}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo 'Run this script as root (for example: sudo bash bootstrap-ubuntu.sh).' >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  fail2ban \
  git \
  logrotate \
  unattended-upgrades \
  ufw

if ! id "${VROMPT_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "${VROMPT_USER}"
fi

usermod --append --groups sudo "${VROMPT_USER}"

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

if [[ ! -f /etc/apt/sources.list.d/docker.list ]]; then
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
fi

apt-get update
apt-get install -y --no-install-recommends \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

usermod --append --groups docker "${VROMPT_USER}"
systemctl enable --now docker
systemctl enable --now fail2ban
systemctl enable --now unattended-upgrades

if ! swapon --show | grep -q .; then
  fallocate -l "${SWAP_SIZE}" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

install -m 0644 /dev/null /etc/fail2ban/jail.d/sshd.local
cat > /etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
EOF
systemctl restart fail2ban

install -m 0644 /dev/null /etc/docker/daemon.json
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF
systemctl restart docker

echo "VPS bootstrap complete for ${VROMPT_USER}."
echo 'Next: add the deploy user SSH key, clone the repository, create .env.production, and run the production Compose checks from the deployment runbook.'
