pipeline {
    agent any

    environment {
        CARGO_HOME = "${env.WORKSPACE}/.cargo"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Dependencies') {
            steps {
                sh 'apt-get update && apt-get install -y ffmpeg libavcodec-dev libavformat-dev libavutil-dev libavdevice-dev'
            }
        }

        stage('Lint') {
            steps {
                sh 'cargo clippy --workspace -- -D warnings'
                sh 'cargo fmt --all -- --check'
            }
        }

        stage('Test') {
            steps {
                sh 'cargo test --workspace'
            }
        }

        stage('Build WebAssembly') {
            steps {
                sh 'curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh'
                dir('rust/core') {
                    sh 'wasm-pack build --target web --out-dir ../../apps/web/pkg'
                }
            }
        }

        stage('Deploy Infrastructure (Terraform)') {
            when {
                branch 'main'
            }
            steps {
                dir('infra/terraform') {
                    sh 'terraform init'
                    sh 'terraform apply -auto-approve'
                }
            }
        }
    }
}
