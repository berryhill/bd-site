#!/usr/bin/env bash
set -euo pipefail

# Reattach bd-site production blog PVC to the old retained Linode PV.
# This fixes the case where Helm recreated default/bd-site-posts-pvc and Kubernetes
# provisioned a new empty PV instead of reusing the retained historical PV.
#
# Usage:
#   bash scripts/reattach-old-blog-pv.sh --yes
#
# Defaults are intentionally hard-coded for the 2026-06-21 bd-site incident.

NAMESPACE="${NAMESPACE:-default}"
DEPLOYMENT="${DEPLOYMENT:-bd-site}"
PVC_NAME="${PVC_NAME:-bd-site-posts-pvc}"
OLD_PV="${OLD_PV:-pvc-f0ab8fddad7c402d}"
STORAGE_CLASS="${STORAGE_CLASS:-linode-block-storage-retain}"
SIZE="${SIZE:-25Gi}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/bd-site-pv-rebind-$(date +%Y%m%d-%H%M%S)}"
YES="false"

for arg in "$@"; do
  case "$arg" in
    --yes|-y)
      YES="true"
      ;;
    --help|-h)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: bash scripts/reattach-old-blog-pv.sh --yes" >&2
      exit 2
      ;;
  esac
done

if [[ "$YES" != "true" ]]; then
  cat >&2 <<EOF
Refusing to run without --yes.

This script will:
  1. scale deployment/$DEPLOYMENT in namespace $NAMESPACE to 0
  2. backup current PVC/PV YAML to $BACKUP_DIR
  3. clear claimRef on old PV $OLD_PV
  4. delete the current PVC $NAMESPACE/$PVC_NAME
  5. recreate $NAMESPACE/$PVC_NAME bound explicitly to $OLD_PV
  6. scale deployment/$DEPLOYMENT back to 1

Run:
  bash scripts/reattach-old-blog-pv.sh --yes
EOF
  exit 2
fi

command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required" >&2; exit 127; }

mkdir -p "$BACKUP_DIR"
echo "[1/9] Capturing current state in $BACKUP_DIR"
kubectl -n "$NAMESPACE" get deployment "$DEPLOYMENT" -o yaml > "$BACKUP_DIR/deployment-${DEPLOYMENT}.before.yaml"
kubectl -n "$NAMESPACE" get pvc "$PVC_NAME" -o yaml > "$BACKUP_DIR/pvc-${PVC_NAME}.before.yaml" || true
kubectl get pv "$OLD_PV" -o yaml > "$BACKUP_DIR/pv-${OLD_PV}.before.yaml"
kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/name="$DEPLOYMENT" -o wide > "$BACKUP_DIR/pods.before.txt" || true
kubectl -n "$NAMESPACE" get pods -l app="$DEPLOYMENT" -o wide >> "$BACKUP_DIR/pods.before.txt" || true
kubectl get pv > "$BACKUP_DIR/pv-list.before.txt"
kubectl -n "$NAMESPACE" get pvc > "$BACKUP_DIR/pvc-list.before.txt"

echo "[2/9] Scaling deployment/$DEPLOYMENT down to detach RWO volume"
kubectl -n "$NAMESPACE" scale deployment "$DEPLOYMENT" --replicas=0
kubectl -n "$NAMESPACE" rollout status deployment/"$DEPLOYMENT" --timeout=120s || true

echo "[3/9] Waiting for bd-site pods to terminate"
for _ in $(seq 1 60); do
  POD_COUNT="$(kubectl -n "$NAMESPACE" get pods --no-headers 2>/dev/null | awk -v d="$DEPLOYMENT" '$1 ~ "^" d "-" { c++ } END { print c+0 }')"
  if [[ "$POD_COUNT" == "0" ]]; then
    break
  fi
  echo "  pods still present: $POD_COUNT"
  sleep 2
done

POD_COUNT="$(kubectl -n "$NAMESPACE" get pods --no-headers 2>/dev/null | awk -v d="$DEPLOYMENT" '$1 ~ "^" d "-" { c++ } END { print c+0 }')"
if [[ "$POD_COUNT" != "0" ]]; then
  echo "Timed out waiting for bd-site pods to terminate; refusing to continue." >&2
  exit 1
fi

echo "[4/9] Making old retained PV claimable: $OLD_PV"
if kubectl get pv "$OLD_PV" -o jsonpath='{.spec.claimRef.name}' >/tmp/bd-site-old-pv-claimref-name 2>/dev/null; then
  CLAIM_REF_NAME="$(cat /tmp/bd-site-old-pv-claimref-name)"
else
  CLAIM_REF_NAME=""
fi
if [[ -n "$CLAIM_REF_NAME" ]]; then
  kubectl patch pv "$OLD_PV" --type=json -p='[{"op":"remove","path":"/spec/claimRef"}]'
else
  echo "  old PV has no claimRef; continuing"
fi

echo "[5/9] Deleting current production PVC object: $NAMESPACE/$PVC_NAME"
kubectl -n "$NAMESPACE" delete pvc "$PVC_NAME" --ignore-not-found

echo "[6/9] Recreating production PVC bound explicitly to old PV: $OLD_PV"
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${PVC_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/managed-by: Helm
  annotations:
    meta.helm.sh/release-name: ${DEPLOYMENT}
    meta.helm.sh/release-namespace: ${NAMESPACE}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${STORAGE_CLASS}
  resources:
    requests:
      storage: ${SIZE}
  volumeName: ${OLD_PV}
EOF

echo "[7/9] Verifying PVC is Bound to old PV"
kubectl -n "$NAMESPACE" get pvc "$PVC_NAME" -o wide
BOUND_PV="$(kubectl -n "$NAMESPACE" get pvc "$PVC_NAME" -o jsonpath='{.spec.volumeName}')"
PHASE="$(kubectl -n "$NAMESPACE" get pvc "$PVC_NAME" -o jsonpath='{.status.phase}')"
if [[ "$BOUND_PV" != "$OLD_PV" || "$PHASE" != "Bound" ]]; then
  echo "PVC did not bind correctly. Expected Bound to $OLD_PV; got phase=$PHASE volume=$BOUND_PV" >&2
  exit 1
fi

echo "[8/9] Scaling deployment/$DEPLOYMENT back to 1"
kubectl -n "$NAMESPACE" scale deployment "$DEPLOYMENT" --replicas=1
kubectl -n "$NAMESPACE" rollout status deployment/"$DEPLOYMENT" --timeout=180s

echo "[9/9] Verifying mounted blog files"
kubectl -n "$NAMESPACE" exec deploy/"$DEPLOYMENT" -- sh -lc '
  set -eu
  echo "Mounted files under /app/src/data/blog:"
  find /app/src/data/blog -maxdepth 2 -type f -name "*.md" -print | sort
  echo
  echo "Directory listing:"
  ls -lah /app/src/data/blog
'

echo "Final PVC/PV state:"
kubectl -n "$NAMESPACE" get pvc "$PVC_NAME" -o wide
kubectl get pv "$OLD_PV"

echo "DONE. Backups saved in: $BACKUP_DIR"
