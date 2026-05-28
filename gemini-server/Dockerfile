# Gemini server runtime image. The agate binary, alpine base, and
# ca-certs/openssl come from a pre-built base image (built once via
# .forgejo/workflows/build-agate-base.yaml). This Dockerfile just adds
# the generated gemtext content for the current build — that's a few
# seconds instead of the full cargo install.
#
# agate generates its own ECDSA cert on first run if /certs is empty.
# Without a persistent volume on Bunny Magic Containers, a fresh cert
# is created per container start — meaning every redeploy invalidates
# the cert and Gemini clients (TOFU) will warn on the next visit.
# Acceptable for a low-traffic personal capsule; revisit with a
# persistent volume or pre-baked ECDSA cert if it gets annoying.

# Base image is configurable via build arg so the workflow can pass
# whatever AGATE_BASE_IMAGE points at. Default matches the workflow's
# convention.
ARG AGATE_BASE_IMAGE=andystevensname/agate-base
FROM ${AGATE_BASE_IMAGE}:latest
COPY dist-gemini/ /content/
RUN mkdir -p /certs

ENV GEMINI_HOSTNAME=gemini.andystevens.name
EXPOSE 1965

CMD ["sh", "-c", "exec agate --content /content --certs /certs --addr 0.0.0.0:1965 --hostname \"${GEMINI_HOSTNAME}\""]
