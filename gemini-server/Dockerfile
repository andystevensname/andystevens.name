# Gemini server runtime image. The agate binary, alpine base,
# ca-certs/openssl, and the /certs dir all come from a pre-built base
# image (built once via .forgejo/workflows/build-agate-base.yaml). This
# Dockerfile just adds the generated gemtext content for the current
# build — that's a few seconds instead of the full cargo install.
#
# IMPORTANT: this Dockerfile deliberately has NO `RUN` step. The runner
# cross-builds linux/amd64 (Bunny is amd64-only) on an arm64 machine, so
# any RUN here would have to execute an amd64 binary under binfmt/qemu
# emulation. That emulation is kernel state that a machine restart wipes
# (the 2026-06-13 macOS update did exactly this and broke the build at
# `RUN mkdir -p /certs`). FROM + COPY + ENV/EXPOSE/CMD execute nothing in
# the target arch, so this build is immune to emulation being absent.
# /certs is created in agate-base instead (see agate-base.Dockerfile).
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

ENV GEMINI_HOSTNAME=gemini.andystevens.name
EXPOSE 1965

CMD ["sh", "-c", "exec agate --content /content --certs /certs --addr 0.0.0.0:1965 --hostname \"${GEMINI_HOSTNAME}\""]
