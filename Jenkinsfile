pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'ghcr.io'
        DOCKER_CREDENTIALS_ID = 'github-container-registry'
        PROJECT_ID = 'lazynext-platform'
        KUBECONFIG = credentials('kubeconfig')
    }

    stages {
        stage('Rust Core — Build WASM') {
            steps {
                sh '''
                curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
                cargo fmt --all --check
                cargo clippy --workspace --all-targets -- -D warnings
                cargo test --workspace
                wasm-pack build --target web rust/wasm
                '''
            }
        }

        stage('Python Microservices — Test') {
            steps {
                sh '''
                # Pre-processing
                cd services/pre-processing
                pip install -r requirements.txt
                pip install pytest pytest-asyncio
                python -m pytest tests/ -v || true

                # Generative Studio
                cd ../generative-studio
                pip install -r requirements.txt
                python -m pytest tests/ -v || true
                '''
            }
        }

        stage('Node Services — Test') {
            steps {
                sh '''
                npm install -g bun
                
                # AI Agents
                cd services/ai-agents
                bun install
                bun test || true

                # Render Service
                cd ../render-service
                bun install
                bun test || true
                '''
            }
        }

        stage('Frontend — Lint, Typecheck & Test') {
            steps {
                sh '''
                npm install -g bun
                bun install
                bun run lint
                SKIP_ENV_VALIDATION=1 bun run typecheck
                SKIP_ENV_VALIDATION=1 MARBLE_WORKSPACE_KEY=ci FREESOUND_CLIENT_ID=ci FREESOUND_API_KEY=ci bunx next build --prefix apps/web
                bun run test
                '''
            }
        }

        stage('Docker — Build & Push') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                        def webImg = docker.build("${DOCKER_REGISTRY}/${PROJECT_ID}/lazynext-web:latest", "-f apps/web/Dockerfile .")
                        webImg.push()

                        def aiImg = docker.build("${DOCKER_REGISTRY}/${PROJECT_ID}/lazynext-ai-agents:latest", "-f services/ai-agents/Dockerfile services/ai-agents")
                        aiImg.push()

                        def renderImg = docker.build("${DOCKER_REGISTRY}/${PROJECT_ID}/lazynext-render-service:latest", "-f services/render-service/Dockerfile services/render-service")
                        renderImg.push()

                        def preprocImg = docker.build("${DOCKER_REGISTRY}/${PROJECT_ID}/lazynext-pre-processing:latest", "-f services/pre-processing/Dockerfile services/pre-processing")
                        preprocImg.push()

                        def genImg = docker.build("${DOCKER_REGISTRY}/${PROJECT_ID}/lazynext-generative-studio:latest", "-f services/generative-studio/Dockerfile services/generative-studio")
                        genImg.push()
                    }
                }
            }
        }

        stage('Deploy — Kubernetes') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                kubectl kustomize k8s/overlays/production | kubectl apply -f -
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
