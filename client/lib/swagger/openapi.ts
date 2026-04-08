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
        description: "Appelé après la connexion. Nécessite un token CSRF et les cookies de session Supabase. Additionne les quantités guest et user pour chaque produit, plafonne au stock disponible, exclut les produits non publiés, puis supprime le panier guest.",
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
    "/api/cart": {
      get: {
        tags: ["Panier"],
        summary: "Lecture complète du panier",
        description: "Retourne le panier avec lignes détaillées (nom, slug, prix, stock, disponibilité), images Firestore, sous-totaux par ligne et totaux globaux. Supporte guest (cookie session) et utilisateur connecté. Exclut silencieusement les produits non publiés.",
        responses: {
          "200": {
            description: "Contenu du panier",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cartId: { type: "string", nullable: true },
                    lines: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          productId: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          priceTtc: { type: "number" },
                          quantity: { type: "integer" },
                          stockQuantity: { type: "integer" },
                          isAvailable: { type: "boolean" },
                          isStockSufficient: { type: "boolean" },
                          subtotalTtc: { type: "number" },
                          imageUrl: { type: "string", nullable: true },
                        },
                      },
                    },
                    totalItems: { type: "integer", example: 3 },
                    totalTtc: { type: "number", example: 2198.98 },
                  },
                },
              },
            },
          },
          "500": { description: "Erreur serveur" },
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
    "/api/admin/top-produits": {
      get: {
        tags: ["Admin - Top Produits"],
        summary: "Lister les produits vedettes",
        description: "Retourne tous les produits marqués comme top, triés par priorité.",
        responses: {
          "200": {
            description: "Liste des top produits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    produits: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Produit" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Non authentifié" },
          "500": { description: "Erreur serveur" },
        },
      },
      post: {
        tags: ["Admin - Top Produits"],
        summary: "Ajouter un produit aux vedettes",
        description: "Marque un produit publié comme top produit. Limite de 8 produits vedettes.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id_produit"],
                properties: {
                  id_produit: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Produit ajouté aux vedettes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    produit: { $ref: "#/components/schemas/Produit" },
                  },
                },
              },
            },
          },
          "400": { description: "Produit non publié, déjà top, ou limite atteinte" },
          "404": { description: "Produit introuvable" },
        },
      },
    },
    "/api/admin/top-produits/{id}": {
      delete: {
        tags: ["Admin - Top Produits"],
        summary: "Retirer un produit des vedettes",
        description: "Retire un produit de la sélection home sans le supprimer du catalogue. Réindexe les priorités.",
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
            description: "Produit retiré des vedettes",
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
          "400": { description: "Produit pas dans les top" },
          "404": { description: "Produit introuvable" },
        },
      },
    },
    "/api/admin/top-produits/reorder": {
      patch: {
        tags: ["Admin - Top Produits"],
        summary: "Réordonner les produits vedettes",
        description: "Change l ordre de priorité des top produits. Pas de doublons, priorité entier positif.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["produits"],
                properties: {
                  produits: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "priorite"],
                      properties: {
                        id: { type: "string" },
                        priorite: { type: "integer", minimum: 1 },
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
          "404": { description: "Un ou plusieurs produits introuvables dans les top" },
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
    "/api/catalogue/{slug}": {
      get: {
        tags: ["Catalogue public"],
        summary: "Détail d'une catégorie par slug",
        description: "Retourne les informations d'une catégorie active avec image Firestore. 404 si inactive ou inexistante.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "audio-professionnel",
          },
        ],
        responses: {
          "200": {
            description: "Catégorie trouvée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    category: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        description: { type: "string", nullable: true },
                        imageUrl: { type: "string", nullable: true },
                      },
                    },
                    notFound: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          "404": { description: "Catégorie inexistante ou inactive" },
        },
      },
    },
    "/api/catalogue/{slug}/products": {
      get: {
        tags: ["Catalogue public"],
        summary: "Produits paginés d'une catégorie",
        description: "Retourne les produits publiés liés à une catégorie, triés par priorité puis disponibilité. Images enrichies depuis Firestore ImagesProduits.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "audio-professionnel",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", default: 12, maximum: 24 },
          },
        ],
        responses: {
          "200": {
            description: "Liste paginée de produits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          imageUrl: { type: "string", nullable: true },
                          price: { type: "number", nullable: true },
                          isAvailable: { type: "boolean" },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        pageSize: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": { description: "Catégorie inexistante ou inactive" },
        },
      },
    },
    "/api/products/{slug}": {
      get: {
        tags: ["Produit public"],
        summary: "Détail d'un produit par slug",
        description: "Retourne un produit publié avec images Firestore triées, caractéristiques techniques et disponibilité.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "interface-audio-dsp-24",
          },
        ],
        responses: {
          "200": {
            description: "Produit trouvé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    product: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        description: { type: "string", nullable: true },
                        priceHt: { type: "number" },
                        tva: { type: "string" },
                        priceTtc: { type: "number" },
                        stockQuantity: { type: "integer" },
                        isAvailable: { type: "boolean" },
                        characteristics: { type: "object", nullable: true },
                        images: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              url: { type: "string" },
                              ordre: { type: "integer" },
                              isMain: { type: "boolean" },
                              altText: { type: "string", nullable: true },
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
          "404": { description: "Produit inexistant ou non publié" },
        },
      },
    },
    "/api/products/{slug}/similar": {
      get: {
        tags: ["Produit public"],
        summary: "Produits similaires",
        description: "Retourne jusqu'à 6 produits similaires issus des mêmes catégories, triés par disponibilité. Enrichis avec image principale Firestore.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "interface-audio-dsp-24",
          },
        ],
        responses: {
          "200": {
            description: "Liste de produits similaires",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          priceTtc: { type: "number", nullable: true },
                          isAvailable: { type: "boolean" },
                          imageUrl: { type: "string", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": { description: "Produit courant inexistant" },
        },
      },
    },
    "/api/cart/items": {
      post: {
        tags: ["Panier"],
        summary: "Ajouter un produit au panier",
        description: "Ajoute un produit au panier. Supporte guest (cookie session) et utilisateur connecté. Vérifie stock côté serveur. Incrémente si la ligne existe déjà.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id_produit", "quantite"],
                properties: {
                  id_produit: { type: "string", example: "b2c3d4e5-0001-4000-8000-000000000001" },
                  quantite: { type: "integer", minimum: 1, example: 1 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Nouvelle ligne créée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cartLine: {
                      type: "object",
                      properties: {
                        id_ligne_panier: { type: "string" },
                        id_panier: { type: "string" },
                        id_produit: { type: "string" },
                        quantite: { type: "integer" },
                      },
                    },
                    isNewLine: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "200": { description: "Ligne existante incrémentée" },
          "400": { description: "Payload invalide, rupture de stock ou stock insuffisant" },
          "404": { description: "Produit inexistant ou non publié" },
        },
      },
    },
    "/api/cart/items/{id}": {
      patch: {
        tags: ["Panier"],
        summary: "Modifier la quantité d'une ligne",
        description: "Met à jour la quantité d'une ligne panier. Si quantité = 0, suppression implicite. Vérifie la propriété du panier et le stock disponible. Maximum 99 unités par ligne.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "ID de la ligne panier (id_ligne_panier)",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantite"],
                properties: {
                  quantite: { type: "integer", minimum: 0, maximum: 99, example: 3 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Ligne mise à jour ou supprimée",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        cartLine: {
                          type: "object",
                          properties: {
                            id_ligne_panier: { type: "string" },
                            id_panier: { type: "string" },
                            id_produit: { type: "string" },
                            quantite: { type: "integer" },
                          },
                        },
                      },
                    },
                    {
                      type: "object",
                      properties: {
                        deleted: { type: "boolean", example: true },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Quantité invalide ou stock insuffisant",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    availableStock: { type: "integer" },
                  },
                },
              },
            },
          },
          "404": { description: "Panier ou ligne introuvable" },
          "500": { description: "Erreur serveur" },
        },
      },
      delete: {
        tags: ["Panier"],
        summary: "Supprimer une ligne du panier",
        description: "Supprime une ligne panier. Vérifie la propriété du panier avant suppression.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "ID de la ligne panier (id_ligne_panier)",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Ligne supprimée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    deleted: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "404": { description: "Panier ou ligne introuvable" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/search": {
      get: {
        tags: ["Recherche"],
        summary: "Recherche avancée de produits",
        description: "Recherche avec facettes (texte, prix, catégories, disponibilité), scoring de pertinence (exact > 1 diff > starts with > contains), tris dynamiques et pagination. Résultats enrichis avec images Firestore.",
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Terme de recherche (titre, description, caractéristiques techniques JSONB)",
            schema: { type: "string" },
            example: "audio",
          },
          {
            name: "price_min",
            in: "query",
            description: "Prix minimum TTC",
            schema: { type: "number" },
            example: 100,
          },
          {
            name: "price_max",
            in: "query",
            description: "Prix maximum TTC",
            schema: { type: "number" },
            example: 1000,
          },
          {
            name: "categories",
            in: "query",
            description: "IDs catégories séparés par virgule",
            schema: { type: "string" },
            example: "cat-001,cat-002",
          },
          {
            name: "available_only",
            in: "query",
            description: "Filtrer uniquement les produits en stock",
            schema: { type: "string", enum: ["true", "false"] },
          },
          {
            name: "sort",
            in: "query",
            description: "Tri des résultats",
            schema: { type: "string", enum: ["relevance", "price_asc", "price_desc", "availability"] },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 12, maximum: 48 },
          },
        ],
        responses: {
          "200": {
            description: "Résultats de recherche",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          slug: { type: "string" },
                          description: { type: "string", nullable: true },
                          priceTtc: { type: "number", nullable: true },
                          isAvailable: { type: "boolean" },
                          imageUrl: { type: "string", nullable: true },
                          relevanceScore: { type: "integer" },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
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
    "/api/search/facets": {
      get: {
        tags: ["Recherche"],
        summary: "Facettes disponibles pour la recherche",
        description: "Retourne les catégories actives, les bornes de prix min/max des produits publiés, et les options de tri disponibles.",
        responses: {
          "200": {
            description: "Facettes de recherche",
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
                        },
                      },
                    },
                    priceRange: {
                      type: "object",
                      nullable: true,
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                      },
                    },
                    sortOptions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          value: { type: "string" },
                          label: { type: "string" },
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
    "/api/auth/register": {
      post: {
        tags: ["Authentification"],
        summary: "Créer un nouveau compte utilisateur",
        description: "Inscription avec validation serveur, hash mot de passe via Supabase Auth, envoi email de vérification. Anti-énumération : même réponse si email déjà pris.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "mot_de_passe", "mot_de_passe_confirmation", "nom_complet", "cgu_acceptee"],
                properties: {
                  email: { type: "string", example: "marc@example.com" },
                  mot_de_passe: { type: "string", example: "Secure1pwd" },
                  mot_de_passe_confirmation: { type: "string", example: "Secure1pwd" },
                  nom_complet: { type: "string", example: "Marc Dupont" },
                  cgu_acceptee: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Compte créé (ou email déjà pris — même message pour anti-énumération)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Compte créé. Vérifiez votre email pour activer votre compte." },
                  },
                },
              },
            },
          },
          "400": {
            description: "Payload invalide (email, mot de passe, CGU, confirmation)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    errors: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "429": { description: "Rate limit dépassé" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/verify-email": {
      get: {
        tags: ["Authentification"],
        summary: "Vérifier l adresse email via token",
        description: "Valide le token de vérification, active le compte (statut actif, email_verifie true) et redirige vers /connexion?verified=true. Token expiré ou invalide retourne 400.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Token de vérification reçu par email",
          },
        ],
        responses: {
          "307": { description: "Redirection vers /connexion?verified=true en cas de succès" },
          "400": {
            description: "Token invalide, expiré ou absent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Lien invalide ou expiré." },
                  },
                },
              },
            },
          },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/resend-verification": {
      post: {
        tags: ["Authentification"],
        summary: "Renvoyer l email de vérification",
        description: "Génère un nouveau token et renvoie l email de vérification. Anti-énumération : même réponse 200 que l email existe ou non.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "marc@example.com" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message générique (anti-énumération)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Si un compte existe avec cet email, un lien de vérification a été envoyé." },
                  },
                },
              },
            },
          },
          "400": { description: "Email invalide" },
          "429": { description: "Rate limit dépassé" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentification"],
        summary: "Connexion utilisateur",
        description: "Authentifie l utilisateur via email et mot de passe. Vérifie que l email est vérifié et le compte actif. Supporte l option remember me (cookie 30 jours).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "mot_de_passe"],
                properties: {
                  email: { type: "string", example: "user@example.com" },
                  mot_de_passe: { type: "string", example: "Secure1pwd" },
                  se_souvenir: { type: "boolean", example: false, description: "Active le cookie remember me (30 jours)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Connexion réussie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Connexion réussie." },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        nomComplet: { type: "string" },
                        isAdmin: { type: "boolean" },
                        statut: { type: "string", enum: ["actif", "inactif", "en_attente"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Email ou mot de passe manquant" },
          "401": { description: "Identifiants incorrects" },
          "403": { description: "Email non vérifié (code EMAIL_NOT_VERIFIED) ou compte inactif" },
          "429": { description: "Rate limit dépassé" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentification"],
        summary: "Déconnexion utilisateur",
        description: "Déconnecte l utilisateur, supprime le cookie remember me et journalise l événement.",
        responses: {
          "200": {
            description: "Déconnexion réussie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Déconnexion réussie." },
                  },
                },
              },
            },
          },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Authentification"],
        summary: "Demander la réinitialisation du mot de passe",
        description: "Génère un token de réinitialisation (SHA-256, expiry 1h) et envoie un email. Anti-énumération : même réponse 200 que l email existe ou non.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message générique (anti-énumération)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." },
                  },
                },
              },
            },
          },
          "400": { description: "Email invalide" },
          "429": { description: "Rate limit dépassé" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/reset-password/validate": {
      get: {
        tags: ["Authentification"],
        summary: "Valider un token de réinitialisation",
        description: "Vérifie que le token de réinitialisation est valide et non expiré. Utilisé par le frontend avant d afficher le formulaire.",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Token brut reçu par email",
          },
        ],
        responses: {
          "200": {
            description: "Token valide",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "400": { description: "Token absent, introuvable ou expiré" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Authentification"],
        summary: "Réinitialiser le mot de passe",
        description: "Vérifie le token, valide le nouveau mot de passe et met à jour via Supabase Auth admin. Le token est consommé après usage.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "mot_de_passe", "mot_de_passe_confirmation"],
                properties: {
                  token: { type: "string", description: "Token brut reçu par email" },
                  mot_de_passe: { type: "string", example: "NewSecure1pwd" },
                  mot_de_passe_confirmation: { type: "string", example: "NewSecure1pwd" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Mot de passe réinitialisé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Mot de passe réinitialisé avec succès." },
                  },
                },
              },
            },
          },
          "400": { description: "Token invalide/expiré, mot de passe faible ou confirmation incorrecte" },
          "429": { description: "Rate limit dépassé" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/checkout/payment-intent": {
      post: {
        tags: ["Checkout"],
        summary: "Créer un PaymentIntent Stripe",
        description: "Calcule le total du panier, vérifie le stock et crée un PaymentIntent Stripe. Fonctionne pour utilisateurs connectés et invités.",
        responses: {
          "200": {
            description: "PaymentIntent créé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    clientSecret: { type: "string", example: "pi_xxx_secret_xxx" },
                    paymentIntentId: { type: "string", example: "pi_xxx" },
                    amount: { type: "integer", description: "Montant en centimes", example: 5999 },
                  },
                },
              },
            },
          },
          "400": { description: "Panier introuvable, vide ou montant invalide" },
          "409": { description: "Stock insuffisant pour un ou plusieurs produits" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/checkout/payment-methods": {
      get: {
        tags: ["Checkout"],
        summary: "Lister les méthodes de paiement",
        description: "Retourne les méthodes de paiement enregistrées pour l utilisateur connecté. Retourne une liste vide si non authentifié.",
        responses: {
          "200": {
            description: "Liste des méthodes de paiement",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paymentMethods: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PaymentMethod" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Checkout"],
        summary: "Ajouter une méthode de paiement",
        description: "Enregistre une nouvelle méthode de paiement (token Stripe, jamais de données carte brutes). Authentification requise.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["stripePaymentId", "cardHolder", "last4", "expiry"],
                properties: {
                  stripePaymentId: { type: "string", example: "pm_xxx" },
                  cardHolder: { type: "string", example: "Jean Dupont" },
                  last4: { type: "string", example: "4242", pattern: "^\\d{4}$" },
                  expiry: { type: "string", example: "12/27" },
                  isDefault: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Méthode de paiement créée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paymentMethod: { $ref: "#/components/schemas/PaymentMethod" },
                  },
                },
              },
            },
          },
          "400": { description: "Payload invalide (champs manquants ou last4 incorrect)" },
          "401": { description: "Authentification requise" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/checkout/confirm": {
      post: {
        tags: ["Checkout"],
        summary: "Confirmer la commande",
        description: "Vérifie le paiement Stripe, crée la commande avec lignes, décrémente le stock, génère la facture PDF, envoie l email de confirmation. Supporte les utilisateurs connectés et invités (via guestEmail).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paymentIntentId"],
                properties: {
                  paymentIntentId: { type: "string", example: "pi_xxx" },
                  guestEmail: { type: "string", example: "guest@example.com", description: "Requis si non connecté" },
                  address: { $ref: "#/components/schemas/AddressInput" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Commande créée avec succès",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    orderId: { type: "string" },
                    orderNumber: { type: "string", example: "ALT-202604-ABCDEFGH" },
                    status: { type: "string", example: "confirmed" },
                    summary: {
                      type: "object",
                      properties: {
                        totalItems: { type: "integer" },
                        totalHt: { type: "number" },
                        totalTva: { type: "number" },
                        totalTtc: { type: "number" },
                        contactEmail: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "200": { description: "Commande déjà confirmée (idempotence)" },
          "400": { description: "paymentIntentId manquant, email guest manquant, panier introuvable/vide ou adresse invalide" },
          "402": { description: "Paiement Stripe échoué" },
          "409": { description: "Conflit de stock" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/checkout/addresses": {
      get: {
        tags: ["Checkout"],
        summary: "Lister les adresses de l utilisateur",
        description: "Retourne les adresses enregistrées pour l utilisateur connecté.",
        responses: {
          "200": {
            description: "Liste des adresses",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    addresses: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Address" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/orders/{numero}/confirmation": {
      get: {
        tags: ["Commandes"],
        summary: "Page de confirmation commande",
        description: "Retourne les détails complets d une commande pour la page de confirmation. L utilisateur doit être le propriétaire de la commande.",
        parameters: [
          {
            name: "numero",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "ALT-202604-ABCDEFGH",
          },
        ],
        responses: {
          "200": {
            description: "Détails de la commande",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    order: {
                      type: "object",
                      properties: {
                        orderNumber: { type: "string" },
                        status: { type: "string", enum: ["en_attente", "en_cours", "expediee", "livree", "annulee"] },
                        paymentStatus: { type: "string", enum: ["en_attente", "valide", "echoue", "rembourse"] },
                        totalHt: { type: "number" },
                        totalTva: { type: "number" },
                        totalTtc: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                    lines: {
                      type: "array",
                      items: { $ref: "#/components/schemas/OrderLine" },
                    },
                    invoice: {
                      type: "object",
                      nullable: true,
                      properties: {
                        invoiceNumber: { type: "string" },
                        status: { type: "string" },
                        pdfUrl: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "403": { description: "Accès refusé (non propriétaire ou non authentifié)" },
          "404": { description: "Commande introuvable" },
          "500": { description: "Erreur serveur" },
        },
      },
    },
    "/api/admin/invoices/{id}": {
      delete: {
        tags: ["Admin - Factures"],
        summary: "Annuler une facture (créer un avoir)",
        description: "Annule une facture et crée automatiquement un avoir avec génération du PDF. Accès admin requis. Retourne 409 si un avoir existe déjà.",
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
            description: "Facture annulée, avoir créé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    creditNote: {
                      type: "object",
                      properties: {
                        number: { type: "string", example: "AVO-202604-ABCDEFGH" },
                        amount: { type: "number" },
                        pdfUrl: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Non authentifié" },
          "403": { description: "Accès réservé aux administrateurs" },
          "404": { description: "Facture introuvable" },
          "409": { description: "Un avoir existe déjà pour cette facture" },
          "500": { description: "Erreur serveur" },
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
      Produit: {
        type: "object",
        properties: {
          id_produit: { type: "string" },
          nom: { type: "string" },
          description: { type: "string", nullable: true },
          slug: { type: "string" },
          prix_ht: { type: "number" },
          tva: { type: "string", enum: ["20", "10", "5.5", "0"] },
          prix_ttc: { type: "number" },
          quantite_stock: { type: "integer" },
          statut: { type: "string", enum: ["publie", "brouillon"] },
          priorite: { type: "integer" },
          est_top_produit: { type: "boolean" },
        },
      },
      PaymentMethod: {
        type: "object",
        properties: {
          id: { type: "string" },
          cardHolder: { type: "string", example: "Jean Dupont" },
          last4: { type: "string", example: "4242" },
          expiry: { type: "string", example: "12/27" },
          isDefault: { type: "boolean" },
        },
      },
      AddressInput: {
        type: "object",
        properties: {
          savedAddressId: { type: "string", description: "ID d une adresse existante (prioritaire)" },
          firstName: { type: "string", example: "Jean" },
          lastName: { type: "string", example: "Dupont" },
          address1: { type: "string", example: "10 rue de la Paix" },
          address2: { type: "string", nullable: true },
          city: { type: "string", example: "Paris" },
          region: { type: "string", nullable: true },
          postalCode: { type: "string", example: "75001" },
          country: { type: "string", example: "France" },
          phone: { type: "string", example: "0612345678" },
        },
      },
      Address: {
        type: "object",
        properties: {
          id: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          address1: { type: "string" },
          address2: { type: "string", nullable: true },
          city: { type: "string" },
          region: { type: "string", nullable: true },
          postalCode: { type: "string" },
          country: { type: "string" },
          phone: { type: "string" },
          isDefault: { type: "boolean" },
        },
      },
      OrderLine: {
        type: "object",
        properties: {
          productId: { type: "string" },
          productName: { type: "string" },
          productSlug: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          quantity: { type: "integer" },
          unitPriceHt: { type: "number" },
          totalTtc: { type: "number" },
        },
      },
    },
  },
};
