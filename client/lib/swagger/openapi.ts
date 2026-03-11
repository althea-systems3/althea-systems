export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Althea Systems API",
    version: "1.0.0",
    description: "Documentation des routes API du projet Althea Systems",
  },
  servers: [
    { url: "http://localhost:3000", description: "Développement local" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Système"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Le serveur est opérationnel",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "okk" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/carousel": {
      get: {
        tags: ["Contenu"],
        summary: "Récupérer les slides du carrousel",
        responses: {
          "200": {
            description: "Liste des slides",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slides: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          imageUrl: { type: "string" },
                          imageAlt: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string" },
                          ctaLabel: { type: "string" },
                          redirectUrl: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Catégories"],
        summary: "Récupérer toutes les catégories",
        responses: {
          "200": {
            description: "Liste des catégories (ou données de fallback)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    categories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          imageUrl: { type: "string", nullable: true },
                        },
                      },
                    },
                    isFallbackData: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/categories/menu": {
      get: {
        tags: ["Catégories"],
        summary: "Récupérer les catégories pour le menu de navigation",
        description: "Retourne les catégories actives triées par ordre d'affichage. Réponse cachée 60s.",
        responses: {
          "200": {
            description: "Liste des catégories actives",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    categories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nom: { type: "string", example: "Bijoux" },
                          slug: { type: "string", example: "bijoux" },
                          ordre_affiche: { type: "number", example: 1 },
                          image_url: { type: "string", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Erreur serveur",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Impossible de charger les catégories." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentification"],
        summary: "Récupérer la session utilisateur",
        description: "Nécessite les cookies de session Supabase.",
        responses: {
          "200": {
            description: "Informations de session",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    isAuthenticated: { type: "boolean" },
                    user: {
                      type: "object",
                      nullable: true,
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        nomComplet: { type: "string" },
                        isAdmin: { type: "boolean" },
                        statut: { type: "string" },
                        locale: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/merge-cart": {
      post: {
        tags: ["Panier"],
        summary: "Fusionner le panier guest dans le panier utilisateur",
        description: "Appelé après la connexion. Nécessite un token CSRF et les cookies de session Supabase. Transfère les lignes du panier guest vers le panier de l'utilisateur connecté, puis supprime le panier guest.",
        parameters: [
          {
            name: "x-csrf-token",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Token CSRF pour la protection contre les attaques CSRF",
          },
        ],
        responses: {
          "200": {
            description: "Résultat du merge",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        isMerged: { type: "boolean", example: true },
                      },
                    },
                    {
                      type: "object",
                      properties: {
                        isMerged: { type: "boolean", example: false },
                        reason: { type: "string", example: "aucun_panier_guest" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Non authentifié",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Authentification requise." },
                  },
                },
              },
            },
          },
          "500": {
            description: "Erreur serveur",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Impossible de créer le panier." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/cart/count": {
      get: {
        tags: ["Panier"],
        summary: "Compter les articles du panier",
        description: "Retourne le nombre d'articles. Utilise les cookies de session (user connecté) ou le cookie cart_session_id (guest).",
        responses: {
          "200": {
            description: "Nombre d'articles dans le panier",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "number", example: 3 },
                    total: { type: "number", example: 3 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
