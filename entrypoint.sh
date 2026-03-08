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
    exec node /app/back/dist/index.js
    ;;

  front)
    exec npx --yes serve -s /app/public -l 8080
    ;;

  all)
    # Lance le back en arrière-plan puis le front au premier plan.
    # Si l'un des deux s'arrête, le conteneur s'arrête via le trap.
    node /app/back/dist/index.js &
    BACK_PID=$!

    # Attente que le back soit prêt (max 15 s)
    echo "[entrypoint] Attente du back (PID ${BACK_PID})..."
    i=0
    while [ $i -lt 15 ]; do
      if kill -0 "${BACK_PID}" 2>/dev/null; then
        break
      fi
      sleep 1
      i=$((i + 1))
    done

    # Le front est servi par Express (express.static) sur le même port 3001.
    # En mode "all" on n'a donc pas besoin d'un second processus :
    # le back sert déjà le front. On attend simplement que le back se termine.
    echo "[entrypoint] Back + Front sur le port 3001."
    wait "${BACK_PID}"
    ;;

  *)
    echo "[entrypoint] APP_MODE inconnu : '${APP_MODE}'. Valeurs acceptées : back | front | all"
    exit 1
    ;;

esac
