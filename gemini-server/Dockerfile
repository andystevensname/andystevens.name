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
RUN apk add --no-cache ca-certificates
COPY --from=build /out/bin/agate /usr/local/bin/agate
COPY dist-gemini/ /content/

# agate generates its own ECDSA keys on first run (Ed25519 if -e is
# passed). Trying to seed with our own RSA cert was tripping
# "A folder for <host> exists, but there is no certificate or key file"
# because agate didn't recognise the key format/algorithm. Empty /certs
# is what agate wants — it writes cert.pem + key.rsa itself on startup.
#
# Caveat: without a persistent volume the cert is fresh every container
# start, so Gemini clients (TOFU) warn on each redeploy. Acceptable for
# a low-traffic capsule; revisit with a Bunny Magic Containers volume
# (or a baked-in long-lived cert in the correct ECDSA format) later.
RUN mkdir -p /certs

ENV GEMINI_HOSTNAME=gemini.andystevens.name
EXPOSE 1965

CMD ["sh", "-c", "exec agate --content /content --certs /certs --addr 0.0.0.0:1965 --hostname \"${GEMINI_HOSTNAME}\""]
