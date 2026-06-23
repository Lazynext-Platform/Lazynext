#!/bin/bash
# k8s-audit.sh - Basic Kubernetes Manifest Security Scanner

echo "Scanning k8s/base/ manifests for security issues..."

EXIT_CODE=0

# Check for privileged containers
if grep -q "privileged: true" k8s/base/*.yaml; then
    echo "❌ SECURITY WARNING: Privileged containers detected in manifests!"
    grep -n "privileged: true" k8s/base/*.yaml
    EXIT_CODE=1
else
    echo "✅ No privileged containers found."
fi

# Check for runAsRoot (best practice is to runAsNonRoot)
if grep -q "runAsUser: 0" k8s/base/*.yaml; then
    echo "❌ SECURITY WARNING: Containers explicitly running as root (runAsUser: 0) detected!"
    grep -n "runAsUser: 0" k8s/base/*.yaml
    EXIT_CODE=1
else
    echo "✅ No explicit root users (runAsUser: 0) found."
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 Audit Passed: Basic security checks look good."
else
    echo "⚠️ Audit Failed: Please fix the security issues above."
fi

exit $EXIT_CODE
