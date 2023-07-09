#/bin/bash

set -e

if [ $(whereis sudo | grep ' ' -ic) == 0 ]; then 
  apt update && apt install -y sudo
fi

if [ $(whereis node | grep ' ' -ic) == 0 ]; then 
  curl -sL https://deb.nodesource.com/setup_18.x | bash - \
      && apt install -y gcc g++ make nodejs \
      && npm install -g npm@latest
fi

if [ $(whereis signalk-server | grep ' ' -ic) == 0 ]; then 
  apt update \
      && apt install -y libnss-mdns avahi-utils libavahi-compat-libdnssd-dev \
      && npm install -g signalk-server
fi

mkdir -p /opt/signalk
cat <<EOT > /etc/systemd/system/signalk.socket
[Socket]
ListenStream=3000

[Install]
WantedBy=sockets.target
EOT
cat <<EOT > /etc/systemd/system/signalk.service
[Service]
ExecStart=$(which signalk-server) -c /opt/signalk \$*
Restart=always
StandardOutput=syslog
StandardError=syslog
WorkingDirectory=/opt/signalk
User=root
Environment=EXTERNALPORT=3000
Environment=NODE_ENV=production
Environment=RUN_FROM_SYSTEMD=true

[Install]
WantedBy=multi-user.target
EOT
systemctl daemon-reload || true
systemctl enable signalk.service || true
systemctl enable signalk.socket || true
systemctl start signalk.socket || true
systemctl start signalk.service || true
