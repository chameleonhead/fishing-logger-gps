#!/usr/bin/env bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cp $SCRIPT_DIR/fishing-logger-gps.service /etc/systemd/system/
chmod 664 /etc/systemd/system/fishing-logger-gps.service
systemctl daemon-reload
systemctl start fishing-logger-gps.service
