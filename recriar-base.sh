#!/bin/bash
# Recria a base de dados Firestore do MainGoal.
#
# A base (default) original foi eliminada e ficou um registo morto que devolve
# "Cannot serve requests because the database was deleted." O nome só fica
# livre depois de esse registo ser removido.
#
# A nova base fica em eur3 (Europa) em vez de nam5 (EUA), com protecção
# contra eliminação e point-in-time recovery activos.

set -e

PROJECT="maingoal-4a29c"

echo "==> A remover o registo morto da base (default)…"
firebase firestore:databases:delete "(default)" --project "$PROJECT" --force

echo "==> A criar a base em eur3 com as protecções activas…"
firebase firestore:databases:create "(default)" \
  --project "$PROJECT" \
  --location eur3 \
  --delete-protection ENABLED \
  --point-in-time-recovery ENABLED

echo "==> A publicar as regras de segurança…"
firebase deploy --only firestore:rules --project "$PROJECT"

echo
echo "Concluído. Verificação:"
curl -s "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/teste" --max-time 15
echo
echo "Um 403/404 em JSON significa que a base está viva."
echo "Se ainda disser 'database was deleted', aguarda 1-2 minutos e repete."
