FROM ubuntu:22.04

# enable systemd
# ref: https://dev.classmethod.jp/articles/the-way-using-systemd-inside-docker-container/
#      https://takuya-1st.hatenablog.jp/entry/2021/05/25/040508
STOPSIGNAL SIGRTMIN+3

USER root
WORKDIR /root

RUN apt update -y \
    && apt install -y init \
    && apt clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    # allow login
    && rm -f /var/run/nologin

# remove all unnecessary service.
RUN rm -f \
    /etc/systemd/system/*.wants/* \
    /lib/systemd/system/*.wants/*

# optional: enable journald.
# known issus: audit won't work under rootless env due to permission.
RUN cd /lib/systemd/system \
    && ln -s ../systemd-journald.socket ./sockets.target.wants/systemd-journald.socket \
    && ln -s ../systemd-journald-audit.socket ./sockets.target.wants/systemd-journald-audit.socket \
    && ln -s ../systemd-journald-dev-log.socket ./sockets.target.wants/systemd-journald-dev-log.socket \
    && ln -s ../systemd-journald.service ./sysinit.target.wants/systemd-journald.service \
    && ln -s ../systemd-journal-flush.service ./sysinit.target.wants/systemd-journal-flush.service

VOLUME [ "/tmp", "/run", "/run/lock" ]

# install nodejs
RUN apt update -y \
    && apt install -y sudo curl \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt install -y gcc g++ make nodejs \
    && npm install -g npm@latest \
    && apt install -y libnss-mdns avahi-utils libavahi-compat-libdnssd-dev \
    && apt clean

# install signalk server
RUN npm install -g signalk-server
COPY install-signalk-server.sh /
RUN bash -c /install-signalk-server.sh

EXPOSE 3000
EXPOSE 8375
EXPOSE 10110

CMD [ "/sbin/init" ]
