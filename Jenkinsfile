// Jenkins declarative pipeline for Lazynext monorepo
// Requires: Docker, Rust (1.96+), Node/Bun, Python 3.13, Terraform, kubectl

pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'lazynext.azurecr.io'
        RUST_VERSION    = '1.96'
        BUN_VERSION     = '1.3.14'
        CARGO_TERM_COLOR = 'always'
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Deployment target')
        booleanParam(name: 'RUN_E2E', defaultValue: true, description: 'Run end-to-end tests')
        booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy after build')
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Branch to build')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git submodule update --init --recursive'
            }
        }

        stage('Setup') {
            parallel {
                stage('Rust') {
                    steps {
                        sh 'rustup default ${RUST_VERSION}'
                        sh 'rustup component add clippy rustfmt'
                        sh 'cargo install wasm-pack cargo-chef'
                    }
                }
                stage('Node') {
                    steps {
                        sh 'curl -fsSL https://bun.sh/install | bash'
                        sh '~/.bun/bin/bun install'
                    }
                }
                stage('Python') {
                    steps {
                        sh 'python3 -m pip install --upgrade pip'
                        sh 'python3 -m pip install -r services/pre-processing/requirements.txt'
                        sh 'python3 -m pip install -r services/generative-studio/requirements.txt'
                    }
                }
            }
        }

        stage('Lint') {
            parallel {
                stage('Rust Lint') {
                    steps {
                        sh 'cargo clippy --workspace -- -D warnings'
                        sh 'cargo fmt --check'
                    }
                }
                stage('TypeScript Lint') {
                    steps {
                        sh '~/.bun/bin/bun run lint'
                        sh '~/.bun/bin/bun run typecheck'
                    }
                }
                stage('Python Lint') {
                    steps {
                        sh 'python3 -m ruff check services/'
                        sh 'python3 -m ruff format --check services/'
                    }
                }
                stage('Terraform Lint') {
                    steps {
                        sh 'terraform -chdir=infra/terraform fmt -check'
                        sh 'terraform -chdir=infra/terraform validate'
                    }
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Build Rust') {
                    steps {
                        sh 'cargo build --workspace --release'
                        sh 'cd rust/wasm && wasm-pack build --target web'
                    }
                }
                stage('Build Web') {
                    steps {
                        sh 'cd apps/web && ~/.bun/bin/bun run build'
                    }
                }
                stage('Build Docker') {
                    steps {
                        sh 'bash scripts/docker-build.sh --tag ${BUILD_NUMBER}'
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'cargo test --workspace'
                        sh '~/.bun/bin/bun test'
                        sh 'python3 -m pytest services/'
                    }
                }
                stage('Integration Tests') {
                    when { expression { params.RUN_E2E } }
                    steps {
                        sh 'bash scripts/full-e2e.sh'
                    }
                }
            }
        }

        stage('Security Scan') {
            parallel {
                stage('Container Scan') {
                    steps { sh 'bash scripts/scan-images.sh' }
                }
                stage('Secret Scan') {
                    steps { sh 'gitleaks detect --source . --config .github/gitleaks.toml' }
                }
            }
        }

        stage('Deploy') {
            when { expression { params.DEPLOY } }
            stages {
                stage('Terraform Apply') {
                    steps {
                        dir('infra/terraform') {
                            sh 'terraform init'
                            sh 'terraform plan -var-file="${params.ENVIRONMENT}.tfvars" -out=tfplan'
                            sh 'terraform apply -auto-approve tfplan'
                        }
                    }
                }
                stage('Docker Push') {
                    steps {
                        sh 'bash scripts/docker-build.sh --push --tag ${BUILD_NUMBER}'
                    }
                }
                stage('Kubernetes Deploy') {
                    steps {
                        sh 'kubectl apply -k k8s/overlays/${params.ENVIRONMENT}/'
                        sh 'kubectl rollout status deployment/web -n lazynext-${params.ENVIRONMENT} --timeout=300s'
                    }
                }
                stage('Smoke Test') {
                    steps {
                        sh 'bash scripts/health-check.sh'
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
            archiveArtifacts artifacts: '**/target/release/lazynext_*', fingerprint: true
            junit '**/test-results/**/*.xml'
        }
        success {
            slackSend(color: 'good', message: "Pipeline ${env.BUILD_NUMBER} succeeded: ${env.BUILD_URL}")
        }
        failure {
            slackSend(color: 'danger', message: "Pipeline ${env.BUILD_NUMBER} failed: ${env.BUILD_URL}")
        }
    }
}
