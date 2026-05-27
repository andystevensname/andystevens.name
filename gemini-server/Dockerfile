# Gemini server image: runs agate, serves the gemtext baked in at build
# time. The Forgejo workflow generates dist-gemini/ from the source posts
# before building this image, so each deploy ships whatever content was
# in the repo at that commit.
#
# agate auto-generates a self-signed certificate on first run if /certs
# is empty. With no persistent volume on Bunny Magic Containers, a new
# cert is created per container start — meaning every redeploy invalidates
# the cert and Gemini clients (TOFU) will warn the next time they visit.
# Acceptable for a low-traffic personal capsule; revisit with a persistent
# cert volume or Let's Encrypt if it gets annoying.

FROM rust:1.81-alpine AS build
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
RUN cargo install --root /out agate

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /out/bin/agate /usr/local/bin/agate
COPY dist-gemini/ /content/
RUN mkdir -p /certs

ENV GEMINI_HOSTNAME=gemini.andystevens.name
EXPOSE 1965

CMD ["sh", "-c", "exec agate --content /content --certs /certs --addr 0.0.0.0:1965 --hostname \"${GEMINI_HOSTNAME}\""]
