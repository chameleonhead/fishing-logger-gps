#!/usr/bin/env bash
systemctl stop fishing-logger-gps.service
systemctl disable fishing-logger-gps.service
rm /etc/systemd/system/fishing-logger-gps.service
systemctl daemon-reload
