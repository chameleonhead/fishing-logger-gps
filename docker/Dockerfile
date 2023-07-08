FROM ubuntu:22.04

RUN apt update && apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt install -y gcc g++ make nodejs \
    && npm install -g npm@latest \
    && apt install -y libnss-mdns avahi-utils libavahi-compat-libdnssd-dev \
    && npm install -g signalk-server

EXPOSE 3000
EXPOSE 8375
EXPOSE 10110

CMD [ "signalk-server" ]
