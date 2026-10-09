pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(false)
  }

  parameters {
    booleanParam(
      name: "BUILD_IMAGES",
      defaultValue: false,
      description: "Build the three production Docker images. Requires Jenkins access to Docker."
    )
  }

  environment {
    CI = "true"
    NODE_ENV = "test"
    MONGODB_URI = "mongodb://mongo:27017/internity_test"
    JWT_SECRET = "jenkins-ci-secret-please-change-32chars"
    BCRYPT_ROUNDS = "4"
    COOKIE_SECURE = "false"
    TRUST_PROXY = "false"
    STAFF_ALLOWED_IPS = ""
    AI_GATEWAY_API_KEY = ""
    RESEND_API_KEY = ""
  }

  stages {
    stage("Install") {
      steps {
        sh "pnpm --version"
        sh "pnpm install --frozen-lockfile"
      }
    }

    stage("Lint") {
      steps {
        sh "pnpm lint"
      }
    }

    stage("Typecheck") {
      steps {
        sh "pnpm typecheck"
      }
    }

    stage("Test") {
      steps {
        sh "pnpm test"
      }
    }

    stage("Build") {
      steps {
        sh "pnpm build"
      }
    }

    stage("Dependency audit") {
      steps {
        sh "pnpm audit --prod --audit-level=critical"
      }
    }

    stage("Build container images") {
      when {
        expression { params.BUILD_IMAGES }
      }
      steps {
        sh """
          test -S /var/run/docker.sock || {
            echo 'Docker socket is not available to this Jenkins agent.'
            exit 1
          }
          docker buildx build --load -f apps/backend/Dockerfile -t internity-backend:jenkins-${BUILD_NUMBER} .
          docker buildx build --load --build-arg VITE_API_URL=/ -f apps/web/Dockerfile -t internity-web:jenkins-${BUILD_NUMBER} .
          docker buildx build --load --build-arg VITE_API_URL=/staff-api --build-arg VITE_BASE_PATH=/staff -f apps/staff/Dockerfile -t internity-staff:jenkins-${BUILD_NUMBER} .
        """
      }
    }
  }

  post {
    always {
      deleteDir()
    }
  }
}
