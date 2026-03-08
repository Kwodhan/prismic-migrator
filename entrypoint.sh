#!/bin/sh
set -e

# ── Mode de lancement ──────────────────────────────────────────────────────────
# APP_MODE=back  → Express API seul        (port 3001)
# APP_MODE=front → serve statique Angular  (port 8080)
# APP_MODE=all   → les deux ensemble       (défaut)
APP_MODE=${APP_MODE:-all}

echo "[entrypoint] APP_MODE=${APP_MODE}"

case "${APP_MODE}" in

  back)
    exec node /app/back/src/index.js
    echo "[entrypoint] Back sur le port 3001."
    ;;

  front)
    exec npx --yes serve -s /app/public -l 8080
    echo "[entrypoint] Front sur le port 8080."
    ;;

  all)
    # Lance le back en arrière-plan puis le front au premier plan.
    # Si l'un des deux s'arrête, le conteneur s'arrête via le trap.
    node /app/back/src/index.js &
    echo "[entrypoint] Back + Front sur le port 3001."
    ;;

  *)
    echo "[entrypoint] APP_MODE inconnu : '${APP_MODE}'. Valeurs acceptées : back | front | all"
    exit 1
    ;;

esac
