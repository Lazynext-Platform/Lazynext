#!/usr/bin/env bash
# Lazynext — Deploy CosyVoice 3 on vast.ai GPU
# ──────────────────────────────────────────────────────────────────
# Prerequisites:
#   1. Sign up at https://vast.ai (no approval needed)
#   2. Get your API key from https://vast.ai/console/apikey
#   3. Add funds ($5 minimum)
#   4. Run: export VASTAI_API_KEY=your_key
#      ./deploy-vastai.sh
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

VASTAI_KEY="${VASTAI_API_KEY:-}"
if [ -z "$VASTAI_KEY" ]; then
	echo "ERROR: Set VASTAI_API_KEY from https://vast.ai/console/apikey"
	exit 1
fi

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "Searching for RTX 3090 (24GB) under \$0.30/hr..."

# Search for cheapest RTX 3090
OFFER=$(curl -s -H "Authorization: Bearer $VASTAI_KEY" \
	"https://vast.ai/api/v0/bundles?type=interruptible&gpu_name=RTX_3090&min_gpu_ram=20&allocated_storage=50&order=score&limit=1" 2>/dev/null | \
	python3 -c "
import json,sys
d = json.load(sys.stdin)
offers = d.get('offers',[])
if not offers: print('NONE'); sys.exit(1)
o = offers[0]
print(json.dumps({'id':o['id'],'gpu':o['gpu_name'],'price':o['dph_total'],'inet':o['inet_down'],'disk':o['disk_space']}))
" 2>/dev/null)

if [ "$OFFER" = "NONE" ] || [ -z "$OFFER" ]; then
	echo "No RTX 3090 available. Trying RTX A5000..."
	OFFER=$(curl -s -H "Authorization: Bearer $VASTAI_KEY" \
		"https://vast.ai/api/v0/bundles?type=interruptible&gpu_name=RTX_A5000&min_gpu_ram=20&allocated_storage=50&order=score&limit=1" | \
		python3 -c "import json,sys;d=json.load(sys.stdin);o=d['offers'][0];print(json.dumps({'id':o['id'],'gpu':o['gpu_name'],'price':o['dph_total']}))")
fi

GPU_ID=$(echo "$OFFER" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null)
GPU_NAME=$(echo "$OFFER" | python3 -c "import json,sys; print(json.load(sys.stdin)['gpu'])" 2>/dev/null)
GPU_PRICE=$(echo "$OFFER" | python3 -c "import json,sys; print(json.load(sys.stdin)['price'])" 2>/dev/null)

echo "Found: $GPU_NAME at \$$GPU_PRICE/hr"
echo ""

# Create instance
echo "Creating instance..."
INSTANCE=$(curl -s -X PUT "https://vast.ai/api/v0/asks/$GPU_ID/" \
	-H "Authorization: Bearer $VASTAI_KEY" \
	-H "Content-Type: application/json" \
	-d '{"image":"pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime","disk":50,"env":{"HF_HOME":"/workspace/.cache"}}' 2>/dev/null)

INSTANCE_ID=$(echo "$INSTANCE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('contract_id',''))" 2>/dev/null)

if [ -z "$INSTANCE_ID" ]; then
	echo -e "${RED}Failed to create instance${NC}"
	echo "$INSTANCE"
	exit 1
fi

echo "Instance #$INSTANCE_ID created. Waiting for it to start..."

# Poll for IP
for i in $(seq 1 30); do
	INSTANCES=$(curl -s -H "Authorization: Bearer $VASTAI_KEY" \
		"https://vast.ai/api/v0/instances" 2>/dev/null | \
		python3 -c "import json,sys; [print(json.dumps({'id':i['id'],'ip':i.get('ssh_host',''),'port':i.get('ssh_port',''),'status':i.get('cur_state','')})) for i in json.load(sys.stdin)['instances'] if str(i['contract_id'])=='$INSTANCE_ID']" 2>/dev/null)

	if [ -n "$INSTANCES" ]; then
		GPU_IP=$(echo "$INSTANCES" | python3 -c "import json,sys; print(json.load(sys.stdin)['ip'])")
		GPU_PORT=$(echo "$INSTANCES" | python3 -c "import json,sys; print(json.load(sys.stdin)['port'])")
		GPU_STATUS=$(echo "$INSTANCES" | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")
		if [ "$GPU_STATUS" = "running" ] && [ -n "$GPU_IP" ]; then
			break
		fi
	fi
	sleep 10
done

if [ -z "${GPU_IP:-}" ]; then
	echo -e "${RED}Timed out waiting for GPU instance${NC}"
	exit 1
fi

echo ""
echo -e "${GREEN}GPU Ready: $GPU_IP:$GPU_PORT${NC}"
echo ""

# Deploy CosyVoice 3
echo "Deploying CosyVoice 3..."
ssh -o StrictHostKeyChecking=no -p "$GPU_PORT" "root@$GPU_IP" 'bash -s' < deploy-cosyvoice-gpu.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}CosyVoice 3 GPU Deployed${NC}"
echo "GPU IP: $GPU_IP"
echo ""
echo "Point main server at it:"
echo "ssh root@192.46.209.127"
echo "echo COSYVOICE_GPU_URL=http://$GPU_IP:8092 >> /opt/lazynext/infra/linode/.env.linode.production"
echo "systemctl restart lazynext-genstudio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
