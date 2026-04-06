#!/bin/sh
set -e

# ── Launch mode ────────────────────────────────────────────────────────────
# APP_MODE=back  → Express API only        (port 3001)
# APP_MODE=front → Angular static serving  (port 8080)
# APP_MODE=all   → both together           (default)
APP_MODE=${APP_MODE:-all}

echo "[entrypoint] APP_MODE=${APP_MODE}"

case "${APP_MODE}" in

  back)
    exec node /app/back/src/index.js
    echo "[entrypoint] Back on port 3001."
    ;;

  front)
    exec npx --yes serve -s /app/public -l 8080
    echo "[entrypoint] Front on port 8080."
    ;;

  all)
    # Start the back in the background, then the front in the foreground.
    # If either stops, the container stops via the trap.
    node /app/back/src/index.js &
    BACK_PID=$!

    # Wait for the back to be ready (max 15 s)
    echo "[entrypoint] Waiting for back (PID ${BACK_PID})..."
    i=0
    while [ $i -lt 15 ]; do
      if kill -0 "${BACK_PID}" 2>/dev/null; then
        break
      fi
      sleep 1
      i=$((i + 1))
    done

    # The front is served by Express (express.static) on the same port 3001.
    # In "all" mode there is therefore no need for a second process:
    # the back already serves the front. We simply wait for the back to finish.
    echo "[entrypoint] Back + Front on port 3001."
    wait "${BACK_PID}"
    ;;

  *)
    echo "[entrypoint] Unknown APP_MODE: '${APP_MODE}'. Accepted values: back | front | all"
    exit 1
    ;;

esac
