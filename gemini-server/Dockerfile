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

# agate requires Rust edition 2024 (stabilized in 1.85). Track the
# latest 1.x stable so future agate releases don't bite us again.
FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
RUN cargo install --root /out agate

FROM alpine:3.22
RUN apk add --no-cache ca-certificates openssl
COPY --from=build /out/bin/agate /usr/local/bin/agate
COPY dist-gemini/ /content/

# Pre-generate a long-lived self-signed cert. agate doesn't auto-generate
# in recent versions; with --hostname matching the subject, it picks up
# cert.pem + key.rsa from --certs. 10y validity so within a single
# image's life the cert is stable and Gemini clients (TOFU) don't warn.
ARG GEMINI_HOSTNAME=gemini.andystevens.name
# agate with --hostname looks for the cert under <certs>/<hostname>/,
# not at the top-level. Put both files there.
RUN mkdir -p "/certs/${GEMINI_HOSTNAME}" && \
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "/certs/${GEMINI_HOSTNAME}/key.rsa" \
        -out "/certs/${GEMINI_HOSTNAME}/cert.pem" \
        -days 3650 \
        -subj "/CN=${GEMINI_HOSTNAME}" \
        -addext "subjectAltName=DNS:${GEMINI_HOSTNAME}"

ENV GEMINI_HOSTNAME=gemini.andystevens.name
EXPOSE 1965

CMD ["sh", "-c", "exec agate --content /content --certs /certs --addr 0.0.0.0:1965 --hostname \"${GEMINI_HOSTNAME}\""]
