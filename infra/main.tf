provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# Vault Integration
resource "kubernetes_namespace" "vault" {
  metadata {
    name = "vault-system"
  }
}

resource "kubernetes_deployment" "vault" {
  metadata {
    name      = "vault"
    namespace = kubernetes_namespace.vault.metadata[0].name
  }

  spec {
    replicas = 2
    
    selector {
      match_labels = {
        app = "vault"
      }
    }

    template {
      metadata {
        labels = {
          app = "vault"
        }
      }

      spec {
        container {
          name  = "vault"
          image = "hashicorp/vault:1.15.2"

          port {
            container_port = 8200
          }

          env {
            name  = "VAULT_ADDR"
            value = "http://0.0.0.0:8200"
          }

          volume_mount {
            name       = "vault-config"
            mount_path = "/vault/config"
          }

          volume_mount {
            name       = "vault-data"
            mount_path = "/vault/data"
          }
        }

        volume {
          name = "vault-config"
          config_map {
            name = "vault-config"
          }
        }

        volume {
          name = "vault-data"
          empty_dir {}
        }
      }
    }
  }
}

# BMAD Studio Application Deployment
resource "kubernetes_deployment" "bmad_studio" {
  metadata {
    name = "bmad-studio"
    labels = {
      app = "bmad-studio"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "bmad-studio"
      }
    }

    template {
      metadata {
        labels = {
          app = "bmad-studio"
        }
      }

      spec {
        container {
          name  = "bmad-studio"
          image = "bmad-studio:latest"

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "1Gi"
            }
          }

          env {
            name = "VAULT_TOKEN"
            value_from {
              secret_key_ref {
                name = "vault-credentials"
                key  = "token"
              }
            }
          }
        }
      }
    }
  }
}

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "bmad_studio_hpa" {
  metadata {
    name = "bmad-studio-hpa"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.bmad_studio.metadata[0].name
    }

    min_replicas = 2
    max_replicas = 10

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}

# Application Load Balancer Service
resource "kubernetes_service" "bmad_studio_alb" {
  metadata {
    name = "bmad-studio-alb"
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-type" = "external"
      "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internet-facing"
    }
  }

  spec {
    selector = {
      app = "bmad-studio"
    }

    port {
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}

# Vault Service
resource "kubernetes_service" "vault" {
  metadata {
    name      = "vault"
    namespace = kubernetes_namespace.vault.metadata[0].name
  }

  spec {
    selector = {
      app = "vault"
    }

    port {
      port        = 8200
      target_port = 8200
    }

    type = "ClusterIP"
  }
}