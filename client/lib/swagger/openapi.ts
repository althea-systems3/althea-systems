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
    "/api/admin/carousel": {
      get: {
        tags: ["Admin - Carrousel"],
        summary: "Lister tous les slides",
        description: "Retourne tous les slides triés par ordre. Accès admin requis.",
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
                      items: { $ref: "#/components/schemas/Carrousel" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Non authentifié" },
          "403": { description: "Accès réservé aux administrateurs" },
        },
      },
      post: {
        tags: ["Admin - Carrousel"],
        summary: "Créer un slide",
        description: "Crée un nouveau slide. Maximum 3 slides. Accès admin requis.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["titre"],
                properties: {
                  titre: { type: "string", example: "Nouveau produit" },
                  texte: { type: "string", nullable: true },
                  lien_redirection: { type: "string", example: "/produits", nullable: true },
                  actif: { type: "boolean", example: false },
                  image_url: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Slide créé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slide: { $ref: "#/components/schemas/Carrousel" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation échouée ou limite atteinte" },
          "401": { description: "Non authentifié" },
          "403": { description: "Accès réservé aux administrateurs" },
        },
      },
    },
    "/api/admin/carousel/{id}": {
      put: {
        tags: ["Admin - Carrousel"],
        summary: "Modifier un slide",
        description: "Met à jour les champs d un slide existant. Accès admin requis.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  texte: { type: "string", nullable: true },
                  lien_redirection: { type: "string", nullable: true },
                  actif: { type: "boolean" },
                  image_url: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Slide modifié",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slide: { $ref: "#/components/schemas/Carrousel" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation échouée" },
          "404": { description: "Slide introuvable" },
        },
      },
      delete: {
        tags: ["Admin - Carrousel"],
        summary: "Supprimer un slide",
        description: "Supprime le slide, ses images Firestore et ses fichiers Storage. Accès admin requis.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Slide supprimé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "404": { description: "Slide introuvable" },
        },
      },
    },
    "/api/admin/carousel/{id}/status": {
      patch: {
        tags: ["Admin - Carrousel"],
        summary: "Activer / désactiver un slide",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["actif"],
                properties: {
                  actif: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Statut mis à jour",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    slide: { $ref: "#/components/schemas/Carrousel" },
                  },
                },
              },
            },
          },
          "400": { description: "Le champ actif doit être un booléen" },
          "404": { description: "Slide introuvable" },
        },
      },
    },
    "/api/admin/carousel/{id}/upload": {
      post: {
        tags: ["Admin - Carrousel"],
        summary: "Uploader une image pour un slide",
        description: "Upload une image desktop ou mobile dans Firebase Storage. Formats : jpeg, png, webp. Taille max : 5 Mo.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "variant"],
                properties: {
                  file: { type: "string", format: "binary" },
                  variant: { type: "string", enum: ["desktop", "mobile"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Image uploadée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    variant: { type: "string", enum: ["desktop", "mobile"] },
                  },
                },
              },
            },
          },
          "400": { description: "Fichier invalide ou variant incorrect" },
          "404": { description: "Slide introuvable" },
        },
      },
    },
    "/api/admin/categories": {
      get: {
        tags: ["Admin - Catégories"],
        summary: "Lister toutes les catégories",
        description: "Retourne toutes les catégories triées par ordre avec comptage produits. Accès admin requis.",
        responses: {
          "200": {
            description: "Liste des catégories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    categories: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/Categorie" },
                          {
                            type: "object",
                            properties: {
                              nombre_produits: { type: "integer", example: 5 },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Non authentifié" },
          "403": { description: "Accès réservé aux administrateurs" },
        },
      },
      post: {
        tags: ["Admin - Catégories"],
        summary: "Créer une catégorie",
        description: "Crée une nouvelle catégorie. Le slug doit être unique. Accès admin requis.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nom", "slug"],
                properties: {
                  nom: { type: "string", example: "Bijoux" },
                  slug: { type: "string", example: "bijoux" },
                  description: { type: "string", nullable: true },
                  statut: { type: "string", enum: ["active", "inactive"], example: "active" },
                  image_url: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Catégorie créée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category: { $ref: "#/components/schemas/Categorie" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation échouée ou slug déjà utilisé" },
          "401": { description: "Non authentifié" },
          "403": { description: "Accès réservé aux administrateurs" },
        },
      },
    },
    "/api/admin/categories/{id}": {
      put: {
        tags: ["Admin - Catégories"],
        summary: "Modifier une catégorie",
        description: "Met à jour les champs d une catégorie existante. Accès admin requis.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  slug: { type: "string" },
                  description: { type: "string", nullable: true },
                  statut: { type: "string", enum: ["active", "inactive"] },
                  image_url: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Catégorie modifiée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category: { $ref: "#/components/schemas/Categorie" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation échouée ou slug déjà utilisé" },
          "404": { description: "Catégorie introuvable" },
        },
      },
      delete: {
        tags: ["Admin - Catégories"],
        summary: "Supprimer une catégorie",
        description: "Supprime la catégorie, ses images Firestore et Storage. Refusé si des produits sont liés. Accès admin requis.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Catégorie supprimée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Produits liés à cette catégorie" },
          "404": { description: "Catégorie introuvable" },
        },
      },
    },
    "/api/admin/categories/{id}/status": {
      patch: {
        tags: ["Admin - Catégories"],
        summary: "Activer / désactiver une catégorie",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["statut"],
                properties: {
                  statut: { type: "string", enum: ["active", "inactive"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Statut mis à jour",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category: { $ref: "#/components/schemas/Categorie" },
                  },
                },
              },
            },
          },
          "400": { description: "Statut invalide" },
          "404": { description: "Catégorie introuvable" },
        },
      },
    },
    "/api/admin/categories/{id}/upload": {
      post: {
        tags: ["Admin - Catégories"],
        summary: "Uploader une image pour une catégorie",
        description: "Upload une image dans Firebase Storage. Formats : jpeg, png, webp. Taille max : 5 Mo.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Image uploadée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Fichier invalide" },
          "404": { description: "Catégorie introuvable" },
        },
      },
    },
    "/api/admin/categories/reorder": {
      patch: {
        tags: ["Admin - Catégories"],
        summary: "Réordonner les catégories",
        description: "Change l ordre d affichage des catégories. Pas de doublons, ordre entier positif.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["categories"],
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "ordre_affiche"],
                      properties: {
                        id: { type: "string" },
                        ordre_affiche: { type: "integer", minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Ordre mis à jour",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Données invalides" },
          "404": { description: "Une ou plusieurs catégories introuvables" },
        },
      },
    },
    "/api/admin/carousel/reorder": {
      patch: {
        tags: ["Admin - Carrousel"],
        summary: "Réordonner les slides",
        description: "Change l ordre d affichage des slides. Pas de doublons, ordre entier positif.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slides"],
                properties: {
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "ordre"],
                      properties: {
                        id: { type: "string" },
                        ordre: { type: "integer", minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Ordre mis à jour",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Données invalides" },
          "404": { description: "Un ou plusieurs slides introuvables" },
        },
      },
    },
  },
  components: {
    schemas: {
      Carrousel: {
        type: "object",
        properties: {
          id_slide: { type: "string" },
          titre: { type: "string" },
          texte: { type: "string", nullable: true },
          lien_redirection: { type: "string", nullable: true },
          ordre: { type: "integer" },
          actif: { type: "boolean" },
          image_url: { type: "string", nullable: true },
        },
      },
      Categorie: {
        type: "object",
        properties: {
          id_categorie: { type: "string" },
          nom: { type: "string" },
          description: { type: "string", nullable: true },
          slug: { type: "string" },
          ordre_affiche: { type: "integer" },
          statut: { type: "string", enum: ["active", "inactive"] },
          image_url: { type: "string", nullable: true },
        },
      },
    },
  },
};
