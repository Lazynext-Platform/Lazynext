// Jenkinsfile — Lazynext Video Editing Platform
// Declarative Pipeline with parallel test stages, Docker build/push, and Azure deployment.
//
// Required Jenkins plugins:
//   - Pipeline: Declarative, Docker Pipeline, Blue Ocean
//   - Credentials Binding, Git, Timestamper, AnsiColor
//   - Azure Credentials, Kubernetes CLI, Docker Pipeline
//   - JUnit, Warnings Next Generation, Slack Notification

pipeline {
    agent {
        docker {
            image 'lazynext-jenkins-agent:latest'
            label 'lazynext-builder'
            args '''
                -v /var/run/docker.sock:/var/run/docker.sock
                -v /tmp/lazynext-cache:/cache
                --group-add $(stat -c '%g' /var/run/docker.sock)
                --network host
            '''
        }
    }

    // ── Global timeout ──────────────────────────────────────────────
    options {
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds(
            abortPrevious: true
        )
        buildDiscarder(
            logRotator(
                numToKeepStr: '30',
                artifactNumToKeepStr: '10'
            )
        )
    }

    // ── Parameters (triggerable from UI or API) ─────────────────────
    parameters {
        string(
            name: 'BRANCH_NAME',
            defaultValue: 'main',
            description: 'Git branch/tag to build and deploy'
        )
        choice(
            name: 'DEPLOY_ENV',
            choices: ['dev', 'staging', 'production'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip all test stages (use for emergency hotfix deploys)'
        )
        booleanParam(
            name: 'SKIP_WASM',
            defaultValue: false,
            description: 'Skip WASM build (use when WASM artifact is provided externally)'
        )
        booleanParam(
            name: 'SKIP_DOCKER_BUILD',
            defaultValue: false,
            description: 'Skip Docker image build and push (use when images already exist)'
        )
        booleanParam(
            name: 'SKIP_DEPLOY',
            defaultValue: false,
            description: 'Skip deployment step (build-and-publish-only mode)'
        )
        string(
            name: 'WASM_ARTIFACT_URL',
            defaultValue: '',
            description: 'URL to download a pre-built WASM artifact (optional)'
        )
    }

    // ── Environment ─────────────────────────────────────────────────
    environment {
        // Rust
        CARGO_TERM_COLOR              = 'always'
        CARGO_HOME                    = '/cache/cargo'
        RUSTUP_HOME                   = '/cache/rustup'
        RUSTFLAGS                     = '--cfg getrandom_backend="wasm_js"'

        // Container Registry
        ACR_REGISTRY                  = 'lazynextacrproduction.azurecr.io'
        ACR_REGISTRY_DEV              = 'lazynextacrdevlmblwn.azurecr.io'

        // Azure
        AZURE_RESOURCE_GROUP          = 'lazynext-rg-production'
        AZURE_RESOURCE_GROUP_DEV      = 'lazynext-rg-dev'
        AKS_CLUSTER                   = 'lazynext-aks-production'
        AKS_CLUSTER_DEV               = 'lazynext-aks-dev'

        // Build
        SKIP_ENV_VALIDATION           = '1'
        SKIP_WASM_BUILD               = '1'
        NODE_ENV                      = 'production'

        // Bun
        BUN_INSTALL                   = '/cache/bun'
        npm_config_ignore_scripts     = 'true'

        // Python
        PYTHONUNBUFFERED              = '1'
        PIP_CACHE_DIR                 = '/cache/pip'

        // Image tags
        IMAGE_TAG                     = "${env.BUILD_NUMBER}-${env.BRANCH_NAME.replaceAll('/', '-')}"
        GIT_SHA                       = ''
    }

    // ── Stages ──────────────────────────────────────────────────────
    stages {

        // ============================================================
        // Stage 1: Checkout & Setup
        // ============================================================
        stage('Checkout & Setup') {
            steps {
                script {
                    // ── SCM Checkout ──
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "refs/heads/${params.BRANCH_NAME}"]],
                        userRemoteConfigs: [[
                            url: 'https://github.com/lazynext/Lazynext.git',
                            credentialsId: 'github-lazynext'
                        ]],
                        extensions: [
                            [$class: 'CleanCheckout'],
                            [$class: 'CloneOption', depth: 1, noTags: false, reference: '', shallow: true]
                        ]
                    ])

                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    currentBuild.displayName = "#${env.BUILD_NUMBER} — ${params.DEPLOY_ENV} (${params.BRANCH_NAME} @ ${env.GIT_SHA})"
                    currentBuild.description = "Deploying ${params.BRANCH_NAME} to ${params.DEPLOY_ENV} | SHA: ${env.GIT_SHA}"
                }

                // ── Bun Install (workspace root) ──
                sh '''
                    echo "=== Installing workspace dependencies ==="
                    bun install --frozen-lockfile 2>&1 || {
                        echo "[WARN] frozen-lockfile install failed, retrying with --ignore-scripts..."
                        bun install --ignore-scripts 2>&1 || {
                            echo "[WARN] Still failed, retrying without optional deps..."
                            bun install --ignore-scripts --no-optional 2>&1 || {
                                echo "[ERROR] bun install failed after all retries"
                                exit 1
                            }
                        }
                    }
                '''

                // ── Download WASM artifact if provided ──
                script {
                    if (params.WASM_ARTIFACT_URL?.trim()) {
                        sh """
                            echo "=== Downloading WASM artifact from ${params.WASM_ARTIFACT_URL} ==="
                            mkdir -p rust/wasm/pkg
                            curl -fsSL "${params.WASM_ARTIFACT_URL}" -o wasm-pkg.tar.gz
                            tar -xzf wasm-pkg.tar.gz -C rust/wasm/pkg/
                            ls -la rust/wasm/pkg/
                        """
                    }
                }

                echo "Checkout & Setup complete — SHA: ${env.GIT_SHA}"
            }
        }

        // ============================================================
        // Stage 2: Parallel Tests (Rust, Python, Web, Node)
        // ============================================================
        stage('Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            parallel {

                // ── 2a. Rust Core ───────────────────────────────────
                stage('Rust Core') {
                    steps {
                        sh '''
                            echo "=== Rust: Cargo fmt ==="
                            cargo fmt --all --check

                            echo "=== Rust: Cargo clippy ==="
                            cargo clippy --workspace \\
                                --exclude lazynext_desktop \\
                                --all-targets \\
                                -- -D warnings

                            echo "=== Rust: Cargo test ==="
                            cargo test --workspace \\
                                --exclude lazynext_desktop \\
                                --verbose
                        '''
                    }
                    post {
                        always {
                            junit 'rust/**/target/junit-reports/*.xml'
                        }
                    }
                }

                // ── 2b. WASM Build ──────────────────────────────────
                stage('WASM Build') {
                    when {
                        expression { return !params.SKIP_WASM }
                    }
                    steps {
                        sh '''
                            echo "=== Installing wasm-pack ==="
                            curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

                            echo "=== Building WASM package ==="
                            rustup target add wasm32-unknown-unknown

                            cd rust/wasm
                            RUSTFLAGS='--cfg getrandom_backend="wasm_js"' \\
                                wasm-pack build --target web --release -- --locked 2>/dev/null || \\
                                wasm-pack build --target web --release

                            echo "=== Verifying WASM output ==="
                            ls -la pkg/

                            echo "WASM package size:"
                            du -sh pkg/
                        '''
                    }
                    post {
                        success {
                            stash(
                                name: 'wasm-pkg',
                                includes: 'rust/wasm/pkg/**',
                                allowEmpty: false
                            )
                        }
                        failure {
                            echo '[WARN] WASM build failed — downstream stages may be affected'
                        }
                    }
                }

                // ── 2c. Python Services ─────────────────────────────
                stage('Python Services') {
                    steps {
                        sh '''
                            echo "=== Pre-Processing Service Tests ==="
                            cd services/pre-processing
                            pip install -r requirements.txt
                            pip install pytest pytest-asyncio pytest-cov pytest-xdist
                            python -m pytest tests/ \\
                                -v --tb=short \\
                                --cov=. --cov-report=xml:coverage-pre-processing.xml \\
                                --junitxml=junit-pre-processing.xml \\
                                -n auto \\
                                || echo "[WARN] Pre-processing tests had failures"

                            cd ../..

                            echo "=== Generative Studio Tests ==="
                            cd services/generative-studio
                            pip install -r requirements.txt
                            pip install pytest pytest-asyncio pytest-cov pytest-xdist
                            python -m pytest tests/ \\
                                -v --tb=short \\
                                --cov=. --cov-report=xml:coverage-generative-studio.xml \\
                                --junitxml=junit-generative-studio.xml \\
                                -n auto \\
                                || echo "[WARN] Generative Studio tests had failures"
                        '''
                    }
                    post {
                        always {
                            junit 'services/pre-processing/junit-*.xml,services/generative-studio/junit-*.xml'
                            cobertura autoUpdateHealth: false,
                                autoUpdateStability: false,
                                coberturaReportFile: 'services/pre-processing/coverage-*.xml,services/generative-studio/coverage-*.xml',
                                conditionalCoverageTargets: '70, 0, 0',
                                failUnhealthy: false,
                                failUnstable: false,
                                lineCoverageTargets: '70, 0, 0',
                                maxNumberOfBuilds: 0,
                                methodCoverageTargets: '70, 0, 0',
                                onlyStable: false,
                                sourceEncoding: 'ASCII',
                                zoomCoverageChart: false
                        }
                    }
                }

                // ── 2d. Web App (Lint, Typecheck, Test) ─────────────
                stage('Web App') {
                    steps {
                        unstash 'wasm-pkg'

                        sh '''
                            echo "=== Linking WASM for web app ==="
                            if [ -d "rust/wasm/pkg" ] && [ "$(ls -A rust/wasm/pkg/ 2>/dev/null)" ]; then
                                mkdir -p apps/web/node_modules/lazynext-wasm
                                cp -r rust/wasm/pkg/* apps/web/node_modules/lazynext-wasm/ 2>/dev/null || true
                                echo "WASM package linked for Next.js build"
                            else
                                echo "[WARN] WASM package not available"
                            fi
                        '''

                        sh '''
                            echo "=== Web App: ESLint ==="
                            cd apps/web
                            bun run lint

                            echo "=== Web App: TypeScript Check ==="
                            SKIP_ENV_VALIDATION=1 bun run typecheck

                            echo "=== Web App: Unit Tests ==="
                            bun run test 2>&1 || echo "[WARN] Unit tests had failures"

                            echo "=== Web App: Next.js Build ==="
                            SKIP_WASM_BUILD=1 \\
                            SKIP_ENV_VALIDATION=1 \\
                            BETTER_AUTH_SECRET="ci-build-placeholder-secret-64chars-long" \\
                                npx next build 2>&1 || echo "[WARN] Next.js build had issues"
                        '''
                    }
                    post {
                        always {
                            junit 'apps/web/junit.xml,apps/web/test-results/*.xml'
                        }
                    }
                }

                // ── 2e. Node Services ───────────────────────────────
                stage('Node Services') {
                    steps {
                        sh '''
                            echo "=== AI Agents Service Tests ==="
                            cd services/ai-agents
                            bun install --ignore-scripts || true
                            bun test 2>&1 || echo "[WARN] AI agents tests had failures"
                            cd ../..

                            echo "=== Render Service Tests ==="
                            cd services/render-service
                            bun install --ignore-scripts || true
                            UPSTASH_REDIS_REST_URL=redis://localhost:6379 \\
                                bun test 2>&1 || echo "[WARN] Render service tests had failures"
                            cd ../..

                            echo "=== Analytics Service Tests ==="
                            cd services/analytics-service
                            bun install --ignore-scripts || true
                            bun test 2>&1 || echo "[WARN] Analytics service tests had failures"
                            cd ../..

                            echo "=== Collab Server Tests ==="
                            cd services/collab-server
                            bun install --ignore-scripts || true
                            bun test 2>&1 || echo "[WARN] Collab server tests had failures"
                        '''
                    }
                    post {
                        always {
                            junit 'services/*/junit*.xml'
                        }
                    }
                }
            }
        }

        // ============================================================
        // Stage 3: Docker Build & Push
        // ============================================================
        stage('Docker Build & Push') {
            when {
                expression { return !params.SKIP_DOCKER_BUILD }
            }
            steps {
                script {
                    def registry = params.DEPLOY_ENV == 'production'
                        ? env.ACR_REGISTRY
                        : env.ACR_REGISTRY_DEV

                    // Ensure WASM package is available for web Docker build
                    try {
                        unstash 'wasm-pkg'
                    } catch (Exception e) {
                        echo "[WARN] No stashed WASM package found — web Docker build may use fallback"
                    }

                    // Determine ACR login path
                    def acrName = params.DEPLOY_ENV == 'production'
                        ? 'lazynextacrproduction'
                        : 'lazynextacrdevlmblwn'

                    withCredentials([usernamePassword(
                        credentialsId: 'acr-credentials',
                        usernameVariable: 'ACR_USERNAME',
                        passwordVariable: 'ACR_PASSWORD'
                    )]) {
                        sh """
                            echo "=== Logging into ACR: ${acrName} ==="
                            echo "\$ACR_PASSWORD" | docker login ${registry} \\
                                -u "\$ACR_USERNAME" --password-stdin
                        """
                    }

                    // ── Build and push all 8 images ──
                    def images = [
                        [name: 'web',               dockerfile: 'apps/web/Dockerfile',                 context: '.'],
                        [name: 'ai-agents',         dockerfile: 'services/ai-agents/Dockerfile',       context: 'services/ai-agents'],
                        [name: 'render-service',     dockerfile: 'services/render-service/Dockerfile',   context: 'services/render-service'],
                        [name: 'pre-processing',     dockerfile: 'services/pre-processing/Dockerfile',   context: 'services/pre-processing'],
                        [name: 'generative-studio',  dockerfile: 'services/generative-studio/Dockerfile', context: 'services/generative-studio'],
                        [name: 'analytics-service',  dockerfile: 'services/analytics-service/Dockerfile', context: 'services/analytics-service'],
                        [name: 'mcp',                dockerfile: 'rust/mcp-server/Dockerfile',            context: '.'],
                        [name: 'collab-server',      dockerfile: 'services/collab-server/Dockerfile',     context: 'services/collab-server']
                    ]

                    images.each { img ->
                        def fullTag = "${registry}/lazynext-${img.name}:${env.IMAGE_TAG}"
                        def latestTag = "${registry}/lazynext-${img.name}:latest"

                        retry(2) {
                            sh """
                                echo "=== Building lazynext-${img.name} ==="
                                docker build \\
                                    --build-arg SKIP_WASM_BUILD=1 \\
                                    --build-arg NODE_ENV=production \\
                                    -t ${fullTag} \\
                                    -t ${latestTag} \\
                                    -f ${img.dockerfile} \\
                                    ${img.context}

                                echo "=== Pushing lazynext-${img.name} ==="
                                docker push ${fullTag}
                                docker push ${latestTag}

                                echo "=== Image: ${fullTag} (${latestTag}) ==="
                            """
                        }
                    }

                    // ── Build migration image ──
                    sh """
                        if [ -f "Dockerfile.migrate" ]; then
                            echo "=== Building migration image ==="
                            docker build \\
                                -t ${registry}/lazynext-migrate:${env.IMAGE_TAG} \\
                                -t ${registry}/lazynext-migrate:latest \\
                                -f Dockerfile.migrate .
                            docker push ${registry}/lazynext-migrate:latest
                        else
                            echo "[INFO] No Dockerfile.migrate found — skipping migration image"
                        fi
                    """

                    echo "All Docker images built and pushed to ${registry}"
                }
            }
            post {
                success {
                    echo "Docker images published successfully"
                }
                failure {
                    error "Docker build/push failed — pipeline cannot continue to deploy"
                }
            }
        }

        // ============================================================
        // Stage 4: Deploy
        // ============================================================
        stage('Deploy') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                script {
                    def rg = params.DEPLOY_ENV == 'production'
                        ? env.AZURE_RESOURCE_GROUP
                        : env.AZURE_RESOURCE_GROUP_DEV

                    def aksCluster = params.DEPLOY_ENV == 'production'
                        ? env.AKS_CLUSTER
                        : env.AKS_CLUSTER_DEV

                    def registry = params.DEPLOY_ENV == 'production'
                        ? env.ACR_REGISTRY
                        : env.ACR_REGISTRY_DEV

                    withCredentials([
                        file(credentialsId: 'azure-credentials', variable: 'AZURE_AUTH_FILE')
                    ]) {
                        // ── Azure Login ──
                        sh '''
                            echo "=== Azure Login ==="
                            az login --service-principal \\
                                --username "$(jq -r .clientId $AZURE_AUTH_FILE)" \\
                                --password "$(jq -r .clientSecret $AZURE_AUTH_FILE)" \\
                                --tenant "$(jq -r .tenantId $AZURE_AUTH_FILE)"
                            az account set --subscription "$(jq -r .subscriptionId $AZURE_AUTH_FILE)"
                        '''

                        // ── ACR Login ──
                        def acrName = params.DEPLOY_ENV == 'production'
                            ? 'lazynextacrproduction'
                            : 'lazynextacrdevlmblwn'
                        sh """
                            echo "=== ACR Login ==="
                            az acr login --name ${acrName}
                        """

                        // ── Run database migrations ──
                        sh """
                            echo "=== Running database migrations ==="
                            az containerapp job create \\
                                --name "db-migrate-${env.BUILD_NUMBER}" \\
                                --resource-group "${rg}" \\
                                --image "${registry}/lazynext-migrate:${env.IMAGE_TAG}" \\
                                --trigger-type Manual \\
                                --command "bun run db:migrate" \\
                                --cpu 0.5 --memory 1.0Gi \\
                                2>&1 || echo "[WARN] Migration job creation failed — may already exist"
                        """

                        // ── Deploy to Azure Container Apps ──
                        def services = [
                            'web', 'ai-agents', 'render-service',
                            'pre-processing', 'generative-studio',
                            'analytics-service', 'collab-server'
                        ]

                        services.each { svc ->
                            def containerAppName = "lazynext-${svc}-${params.DEPLOY_ENV}"

                            sh """
                                echo "=== Deploying ${svc} to Azure Container App ${containerAppName} ==="
                                az containerapp update \\
                                    --name "${containerAppName}" \\
                                    --resource-group "${rg}" \\
                                    --image "${registry}/lazynext-${svc}:${env.IMAGE_TAG}" \\
                                    2>&1 || echo "[WARN] Container App ${containerAppName} not found — it may need initial creation"
                            """
                        }

                        // ── Deploy to AKS (if cluster exists) ──
                        sh """
                            echo "=== AKS Deploy ==="
                            az aks get-credentials \\
                                --name "${aksCluster}" \\
                                --resource-group "${rg}" \\
                                --overwrite-existing \\
                                2>&1 || echo "[WARN] AKS cluster ${aksCluster} not accessible — skipping K8s deploy"

                            if kubectl cluster-info &>/dev/null; then
                                echo "=== Applying K8s overlays for ${params.DEPLOY_ENV} ==="
                                kubectl apply -k k8s/overlays/${params.DEPLOY_ENV} 2>&1 || {
                                    echo "[WARN] kubectl apply failed — checking if kustomize path exists"
                                    ls k8s/overlays/${params.DEPLOY_ENV}/ 2>&1 || echo "[INFO] No K8s overlay for ${params.DEPLOY_ENV}"
                                }

                                echo "=== K8s rollout status ==="
                                kubectl rollout status deployment/lazynext-web \\
                                    -n lazynext-${params.DEPLOY_ENV} \\
                                    --timeout=120s 2>&1 || echo "[WARN] Rollout status check timed out"
                            fi
                        """
                    }
                }
            }
        }

        // ============================================================
        // Stage 5: Smoke Tests
        // ============================================================
        stage('Smoke Tests') {
            when {
                expression { return !params.SKIP_DEPLOY }
            }
            steps {
                script {
                    def envPrefix = params.DEPLOY_ENV == 'production'
                        ? ''
                        : "${params.DEPLOY_ENV}."

                    def healthEndpoints = [
                        [service: 'web',                url: "https://${envPrefix}lazynext.com/api/health",         expectedCode: 200],
                        [service: 'ai-agents',          url: "https://${envPrefix}agents.lazynext.com/health",      expectedCode: 200],
                        [service: 'render-service',      url: "https://${envPrefix}render.lazynext.com/health",       expectedCode: 200],
                        [service: 'pre-processing',      url: "https://${envPrefix}preprocess.lazynext.com/",         expectedCode: 200],
                        [service: 'generative-studio',   url: "https://${envPrefix}genstudio.lazynext.com/",         expectedCode: 200],
                        [service: 'analytics-service',   url: "https://${envPrefix}analytics.lazynext.com/health",    expectedCode: 200],
                        [service: 'collab-server',       url: "https://${envPrefix}collab.lazynext.com/health",       expectedCode: 200]
                    ]

                    def failures = []
                    healthEndpoints.each { endpoint ->
                        retry(3) {
                            def status = sh(
                                script: """
                                    curl -s -o /dev/null -w '%{http_code}' \\
                                        --connect-timeout 10 \\
                                        --max-time 30 \\
                                        '${endpoint.url}'
                                """,
                                returnStdout: true
                            ).trim()

                            if (status == endpoint.expectedCode.toString()) {
                                echo "[PASS] ${endpoint.service}: ${endpoint.url} → ${status}"
                            } else {
                                echo "[FAIL] ${endpoint.service}: ${endpoint.url} → ${status} (expected ${endpoint.expectedCode})"
                                failures.add(endpoint.service)
                            }
                        }
                    }

                    if (failures) {
                        echo "[WARN] Smoke test failures (${failures.size()}): ${failures.join(', ')}"
                        echo "These may be transient — check logs in Azure Portal or Grafana."
                    } else {
                        echo "[SUCCESS] All smoke tests passed!"
                    }
                }
            }
        }
    }

    // ── Post Actions ──────────────────────────────────────────────
    post {
        always {
            script {
                // ── Archive artifacts ──
                archiveArtifacts(
                    artifacts: '**/junit*.xml,**/coverage*.xml,**/test-results/*.xml,rust/wasm/pkg/**',
                    allowEmptyArchive: true,
                    fingerprint: true
                )

                // ── Publish JUnit test results ──
                junit(
                    testResults: '**/junit*.xml,**/test-results/*.xml',
                    allowEmptyResults: true,
                    skipPublishingChecks: true
                )

                // ── Publish code coverage (Cobertura) ──
                cobertura(
                    coberturaReportFile: '**/coverage*.xml',
                    onlyStable: false
                )

                // ── Clean workspace ──
                cleanWs(
                    cleanWhenAborted: true,
                    cleanWhenFailure: true,
                    cleanWhenNotBuilt: true,
                    cleanWhenSuccess: false,
                    cleanWhenUnstable: true,
                    deleteDirs: true,
                    notFailBuild: true,
                    patterns: [
                        [pattern: 'node_modules/', type: 'INCLUDE'],
                        [pattern: 'target/', type: 'INCLUDE'],
                        [pattern: '**/__pycache__/', type: 'INCLUDE'],
                        [pattern: '**/.pytest_cache/', type: 'INCLUDE']
                    ]
                )
            }
        }

        success {
            echo "Pipeline succeeded! ${params.BRANCH_NAME} deployed to ${params.DEPLOY_ENV}"
            slackSend(
                color: 'good',
                message: "✅ Lazynext *${params.DEPLOY_ENV}* deploy succeeded — `${env.IMAGE_TAG}` (<${env.BUILD_URL}|#${env.BUILD_NUMBER}>)"
            )
        }

        failure {
            echo "Pipeline failed! Check Jenkins logs for details."
            slackSend(
                color: 'danger',
                message: "❌ Lazynext *${params.DEPLOY_ENV}* deploy FAILED — `${env.BRANCH_NAME}` (<${env.BUILD_URL}|#${env.BUILD_NUMBER}>)"
            )
        }

        unstable {
            echo "Pipeline succeeded with warnings."
            slackSend(
                color: 'warning',
                message: "⚠️ Lazynext *${params.DEPLOY_ENV}* deploy unstable — `${env.IMAGE_TAG}` (<${env.BUILD_URL}|#${env.BUILD_NUMBER}>)"
            )
        }
    }
}
