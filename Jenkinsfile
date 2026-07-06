// ── Lazynext Jenkins Declarative Pipeline ──────────────────────────────
// Mirrors .github/workflows/production.yml and ci.yml for Jenkins users.
//
// Required Jenkins plugins:
//   - docker-workflow, docker-build-step
//   - git, github, credentials-binding
//   - pipeline-utility-steps, blueocean
//   - warnings-ng, junit, cobertura
//   - slack, ansicolor
//
// Required credentials (Jenkins → Manage Credentials):
//   - docker-hub-credentials          (DockerHub or GHCR)
//   - ghcr-lazynext-platform          (GHCR username + token)
//   - azure-credentials                (Azure service principal)
//   - slack-webhook-url                (Slack incoming webhook)
//   - discord-webhook-url              (Discord incoming webhook)
//   - git-ssh-key                      (for private repo access if needed)

pipeline {
    agent any

    environment {
        CARGO_TERM_COLOR      = "always"
        RUSTFLAGS             = "-D warnings"
        REGISTRY              = "ghcr.io/lazynext-platform"
        IMAGE_TAG             = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        NODE_ENV              = "production"
    }

    stages {

        // ═══════════════════════════════════════════════════════════════
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.GIT_BRANCH = sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
                }
                sh 'git submodule update --init --recursive'
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Audit & Lint') {
            parallel {
                stage('Lint: Rust') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            rustup component add rustfmt clippy
                            cargo fmt --all --check
                            cargo clippy --workspace --all-targets -- -D warnings
                        '''
                    }
                }
                stage('Lint: TypeScript') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            curl -fsSL https://bun.sh/install | bash
                            export PATH="$HOME/.bun/bin:$PATH"
                            cd apps/web && bun install && bun run lint && bun run typecheck
                        '''
                    }
                }
                stage('Lint: Python') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            pip install ruff
                            ruff check .
                        '''
                    }
                }
                stage('Lint: Terraform') {
                    agent { label 'linux' }
                    steps {
                        dir('infra/terraform') {
                            sh '''
                                terraform fmt -check -recursive
                                terraform init -backend=false
                                terraform validate
                            '''
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Test') {
            parallel {
                stage('Test: Rust') {
                    agent { label 'linux' }
                    environment {
                        RUST_BACKTRACE = "1"
                    }
                    steps {
                        sh '''
                            cargo test --workspace -- --nocapture
                        '''
                    }
                }
                stage('Test: Web') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            curl -fsSL https://bun.sh/install | bash
                            export PATH="$HOME/.bun/bin:$PATH"
                            cd apps/web && bun install && bun test
                        '''
                    }
                }
                stage('Test: Extension') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            curl -fsSL https://bun.sh/install | bash
                            export PATH="$HOME/.bun/bin:$PATH"
                            cd apps/browser-extension && bun install && bun test
                        '''
                    }
                }
                stage('Test: Python') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            pip install pytest
                            cd services/pre-processing && pip install -r requirements.txt || true
                            cd ../../services/generative-studio && pip install -r requirements.txt || true
                            cd ../..
                            python -m pytest services/ --tb=short
                        '''
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Build') {
            parallel {
                stage('Build: Rust') {
                    agent { label 'linux' }
                    steps {
                        sh 'cargo build --workspace --release'
                    }
                }
                stage('Build: WASM') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
                            ./build-wasm.sh
                        '''
                    }
                }
                stage('Build: Web') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            curl -fsSL https://bun.sh/install | bash
                            export PATH="$HOME/.bun/bin:$PATH"
                            cd apps/web && bun install && bun run build
                        '''
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Security Scan') {
            parallel {
                stage('Gitleaks') {
                    steps {
                        sh '''
                            docker run --rm -v "$WORKSPACE:/repo" \
                                zricethezav/gitleaks:latest detect \
                                --source=/repo \
                                --config-path=/repo/.github/gitleaks.toml \
                                --verbose --redact
                        '''
                    }
                }
                stage('Cargo Audit') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            cargo install cargo-audit --locked 2>/dev/null || true
                            cargo audit
                        '''
                    }
                }
                stage('Trivy FS Scan') {
                    steps {
                        sh '''
                            docker run --rm -v "$WORKSPACE:/src" aquasec/trivy:latest \
                                fs --scanners vuln,misconfig,secret \
                                --severity HIGH,CRITICAL \
                                --format sarif \
                                --output /src/trivy-results.sarif \
                                /src || true
                        '''
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Docker Build & Push') {
            parallel {
                stage('Build: Web Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file apps/web/Dockerfile \
                                --tag ${REGISTRY}/lazynext-web:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-web:latest \
                                --push .
                        '''
                    }
                }
                stage('Build: AI Agents Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file services/ai-agents/Dockerfile \
                                --tag ${REGISTRY}/lazynext-ai-agents:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-ai-agents:latest \
                                --push services/ai-agents/
                        '''
                    }
                }
                stage('Build: Render Service Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file services/render-service/Dockerfile \
                                --tag ${REGISTRY}/lazynext-render-service:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-render-service:latest \
                                --push services/render-service/
                        '''
                    }
                }
                stage('Build: Pre-Processing Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64 \
                                --file services/pre-processing/Dockerfile \
                                --tag ${REGISTRY}/lazynext-pre-processing:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-pre-processing:latest \
                                --push services/pre-processing/
                        '''
                    }
                }
                stage('Build: Generative Studio Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64 \
                                --file services/generative-studio/Dockerfile \
                                --tag ${REGISTRY}/lazynext-generative-studio:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-generative-studio:latest \
                                --push services/generative-studio/
                        '''
                    }
                }
                stage('Build: API Gateway Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file rust/api-gateway/Dockerfile \
                                --tag ${REGISTRY}/lazynext-api-gateway:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-api-gateway:latest \
                                --push .
                        '''
                    }
                }
                stage('Build: Collab Server Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file services/collab-server/Dockerfile \
                                --tag ${REGISTRY}/lazynext-collab-server:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-collab-server:latest \
                                --push .
                        '''
                    }
                }
                stage('Build: Analytics Service Image') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            docker buildx build \
                                --platform linux/amd64,linux/arm64 \
                                --file services/analytics-service/Dockerfile \
                                --tag ${REGISTRY}/lazynext-analytics-service:${IMAGE_TAG} \
                                --tag ${REGISTRY}/lazynext-analytics-service:latest \
                                --push services/analytics-service/
                        '''
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Deploy') {
            when {
                branch 'main'
            }
            stages {
                stage('Terraform Plan') {
                    agent { label 'linux' }
                    steps {
                        dir('infra/terraform') {
                            withCredentials([
                                string(credentialsId: 'azure-client-id', variable: 'ARM_CLIENT_ID'),
                                string(credentialsId: 'azure-tenant-id', variable: 'ARM_TENANT_ID'),
                                string(credentialsId: 'azure-subscription-id', variable: 'ARM_SUBSCRIPTION_ID')
                            ]) {
                                sh '''
                                    export ARM_USE_OIDC=true
                                    terraform init -reconfigure
                                    terraform workspace select production 2>/dev/null || terraform workspace new production
                                    terraform plan -out=tfplan
                                '''
                            }
                        }
                    }
                }

                stage('Terraform Apply') {
                    agent { label 'linux' }
                    input {
                        message "Apply Terraform changes to production?"
                        ok "Deploy to Production"
                        submitter "admin,jenkins-admin"
                    }
                    steps {
                        dir('infra/terraform') {
                            withCredentials([
                                string(credentialsId: 'azure-client-id', variable: 'ARM_CLIENT_ID'),
                                string(credentialsId: 'azure-tenant-id', variable: 'ARM_TENANT_ID'),
                                string(credentialsId: 'azure-subscription-id', variable: 'ARM_SUBSCRIPTION_ID')
                            ]) {
                                sh '''
                                    export ARM_USE_OIDC=true
                                    terraform apply tfplan
                                '''
                            }
                        }
                    }
                }

                stage('Update Container Apps') {
                    agent { label 'linux' }
                    steps {
                        withCredentials([
                            string(credentialsId: 'azure-client-id', variable: 'ARM_CLIENT_ID'),
                            string(credentialsId: 'azure-tenant-id', variable: 'ARM_TENANT_ID'),
                            string(credentialsId: 'azure-subscription-id', variable: 'ARM_SUBSCRIPTION_ID')
                        ]) {
                            script {
                                def apps = [
                                    'lazynext-web':          'lazynext-web-production',
                                    'lazynext-ai-agents':    'lazynext-ai-agents-production',
                                    'lazynext-render-service':'lazynext-render-production',
                                    'lazynext-pre-processing':'lazynext-pre-processing-production',
                                    'lazynext-generative-studio':'lazynext-gen-studio-production',
                                    'lazynext-api-gateway':  'lazynext-api-gateway-production',
                                    'lazynext-collab-server':'lazynext-collab-server-production',
                                    'lazynext-analytics-service':'lazynext-analytics-service-production'
                                ]
                                apps.each { image, appName ->
                                    sh """
                                        az containerapp update \
                                            --resource-group lazynext-rg-production \
                                            --name ${appName} \
                                            --image ${REGISTRY}/${image}:${IMAGE_TAG}
                                    """
                                }
                            }
                        }
                    }
                }

                stage('Smoke Tests') {
                    agent { label 'linux' }
                    steps {
                        sh '''
                            echo "Running post-deploy smoke tests..."

                            check_url() {
                                local url="$1" name="$2"
                                local code
                                code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null || echo "000")
                                if [ "$code" = "200" ] || [ "$code" = "204" ]; then
                                    echo "  [OK] $name ($code)"
                                else
                                    echo "  [FAIL] $name ($code)"
                                    return 1
                                fi
                            }

                            FAILURES=0

                            check_url "https://lazynext.com/api/health"           "Web App"        || ((FAILURES++))
                            check_url "https://api.lazynext.com/v1/health"        "API Gateway"    || ((FAILURES++))
                            check_url "https://api.lazynext.com/ai/health"        "AI Agents"      || ((FAILURES++))
                            check_url "https://api.lazynext.com/render/health"    "Render Service" || ((FAILURES++))
                            check_url "https://api.lazynext.com/collab/health"    "Collab Server"  || ((FAILURES++))

                            if [ "$FAILURES" -gt 0 ]; then
                                echo "FATAL: $FAILURES smoke test(s) failed"
                                exit 1
                            fi
                            echo "All smoke tests passed"
                        '''
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        stage('Kubernetes Deploy (Optional)') {
            when {
                branch 'main'
                expression { env.ENABLE_K8S_DEPLOY == 'true' }
            }
            agent { label 'linux' }
            steps {
                sh '''
                    kubectl apply -k k8s/overlays/production/
                '''
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    post {
        always {
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: 'target/', type: 'INCLUDE'],
                    [pattern: 'node_modules/', type: 'INCLUDE'],
                    [pattern: '.cache/', type: 'INCLUDE']
                ]
            )
        }
        success {
            script {
                def msg = ":white_check_mark: *Lazynext Pipeline #${BUILD_NUMBER} SUCCEEDED*"
                msg += "\n*Branch:* ${GIT_BRANCH}"
                msg += "\n*Commit:* ${GIT_SHA}"
                msg += "\n*Duration:* ${currentBuild.durationString}"
                msg += "\n*Job URL:* ${BUILD_URL}"
                slackSend(
                    channel: '#lazynext-builds',
                    color: 'good',
                    message: msg
                )
            }
        }
        failure {
            script {
                def msg = ":x: *Lazynext Pipeline #${BUILD_NUMBER} FAILED*"
                msg += "\n*Branch:* ${GIT_BRANCH}"
                msg += "\n*Commit:* ${GIT_SHA}"
                msg += "\n*Failed Stage:* ${env.FAILED_STAGE ?: 'unknown'}"
                msg += "\n*Job URL:* ${BUILD_URL}"
                slackSend(
                    channel: '#lazynext-alerts',
                    color: 'danger',
                    message: msg
                )
            }
        }
        unstable {
            script {
                def msg = ":warning: *Lazynext Pipeline #${BUILD_NUMBER} UNSTABLE*"
                msg += "\n*Branch:* ${GIT_BRANCH}"
                msg += "\n*Commit:* ${GIT_SHA}"
                msg += "\n*Job URL:* ${BUILD_URL}"
                slackSend(
                    channel: '#lazynext-builds',
                    color: 'warning',
                    message: msg
                )
            }
        }
        aborted {
            script {
                def msg = ":no_entry: *Lazynext Pipeline #${BUILD_NUMBER} ABORTED*"
                msg += "\n*Branch:* ${GIT_BRANCH}"
                msg += "\n*Job URL:* ${BUILD_URL}"
                slackSend(
                    channel: '#lazynext-builds',
                    color: '#808080',
                    message: msg
                )
            }
        }
    }
}
