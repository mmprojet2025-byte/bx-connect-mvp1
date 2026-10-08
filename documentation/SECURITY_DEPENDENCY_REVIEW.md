# Revue des dépendances Web — 7 octobre 2026

## Périmètre et résultat

Cette revue concerne les huit dépendances signalées par l’audit npm initial du frontend Web : six alertes de niveau élevé et deux modérées. Une entrée npm peut regrouper plusieurs avis. Cela ne démontre pas huit attaques exploitables sur BX-Connect.

Les corrections restent dans les plages de versions déjà autorisées. Le backend métier est Java/Spring Boot, pas Node.js. Les dépendances du mobile n’ont pas été modifiées.

Après mise à jour ciblée et installation reproductible dans une copie : **npm audit indique zéro alerte** (0 critique, 0 élevée, 0 modérée, 0 faible). Ce résultat décrit les avis connus à la date de la revue ; il ne remplace pas l’analyse des permissions et des workflows.

## Qualification des huit alertes

| Dépendance | Version avant → après | Chemin dans BX-Connect | Exposition et impact applicable | Correction / avis officiels |
|---|---|---|---|---|
| `axios` | `1.19.0` → `1.20.0` | Dépendance directe ; instance créée dans `frontend-web/src/api/axios.js` | Exécuté dans le navigateur, avec l’adaptateur XHR par défaut. Les risques propres à HTTP/2, sockets, proxy et analyse de `data:` de l’adaptateur Node ne correspondent pas à ce backend Java. Les gadgets de pollution de prototype exigent une pollution préalable ; aucun tel scénario n’a été démontré dans l’application. Les autres adaptateurs restent une surface potentielle de la bibliothèque. Mise à jour justifiée en prévention ; validation des sessions et uploads indispensable. | Correctif `1.20.0`, sans version majeure. [Publication du mainteneur](https://github.com/axios/axios/releases/tag/v1.20.0), [adaptateur fetch et prototype](https://github.com/axios/axios/security/advisories/GHSA-vh66-26gq-q6x8), [méthode HTTP héritée](https://github.com/advisories/GHSA-9fr6-4gfg-395g), [redirections fetch](https://github.com/advisories/GHSA-r4gj-5m52-g5wh). |
| `baseline-browser-mapping` | `2.10.29` → `2.11.27` | `autoprefixer` → `browserslist` → `baseline-browser-mapping` | Outil Node de développement/build. Une entrée invalide peut terminer le processus. BX-Connect ne lui transmet pas des requêtes publiques contrôlées par les utilisateurs. Impact plausible sur l’outillage, pas une route métier distante démontrée. | Correctif disponible dès `2.11.0`. [Avis GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv). |
| `brace-expansion` | `1.1.18` → `1.1.21` dans cinq emplacements ; `5.0.9` → `5.0.12` | ESLint et ses plugins → `minimatch@3` → branche 1 ; plugin Vite Sentry → `glob` → `minimatch@10` → branche 5 | Outils Node de lint/build. Motifs spécialement construits : consommation CPU ou épuisement de pile. Aucun formulaire Web ne transmet de motif utilisateur à ces chaînes. Les deux branches doivent être corrigées : ne pas se limiter à l’instance racine. | [Expansion quadratique](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [récursion de groupes](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [récursion de virgules](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p). `1.1.21` et `5.0.12` couvrent les avis. |
| `browserslist` | `4.28.2` → `4.29.3` | `autoprefixer` et `@babel/helper-compilation-targets` | Outil Node. Cache sans éviction et statistiques personnalisées non fiables peuvent provoquer une croissance mémoire ou une erreur. Pas d’API publique BX-Connect exposant des requêtes Browserslist ou des fichiers de statistiques personnalisées. | Correctif disponible dès `4.28.7`. [Cache mémoire](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [statistiques personnalisées](https://github.com/advisories/GHSA-73wf-gq98-2v4g). |
| `dompurify` | `3.4.12` → `3.4.16` | Dépendance optionnelle de `jspdf` | Bibliothèque navigateur. Les avis visent `IN_PLACE`, la suppression via hooks et la réinterprétation de HTML. Les exports actuels utilisent du texte et `jspdf-autotable` ; aucun usage de `IN_PLACE`, `DOMPurify`, `doc.html()` ou `dangerouslySetInnerHTML` trouvé dans les sources Web. Une XSS concrète n’est donc pas démontrée sur ce chemin ; la présence de la bibliothèque justifie néanmoins sa correction. | `3.4.16` couvre les deux avis ; `3.4.13` seul serait insuffisant. [Sous-arbre détaché](https://github.com/advisories/GHSA-55q2-fjhq-7xh7), [racine rawtext](https://github.com/advisories/GHSA-6688-9rhm-gjv2). |
| `js-yaml` | `4.3.1` → `4.3.2` | `eslint` → `@eslint/eslintrc` → `js-yaml` | Outil Node. La limite des clés fusionnées ne borne pas la consommation CPU pour certaines sources vides. Les imports de configuration du lint sont concernés ; aucun import YAML public dans BX-Connect n’a été trouvé sur ce chemin. | [Avis du mainteneur GHSA-2883-xcg3-v3hh](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh). Correctif `4.3.2`. |
| `nanoid` | `3.3.16` → `3.3.20` | `postcss` → `nanoid` | Outil Node. L’avis vise les générateurs personnalisés appelés avec une taille nulle. Le chemin observé dans `postcss/lib/input.js` appelle `nanoid/non-secure` avec la taille fixe 6 ; ce déclencheur précis n’est pas présent. | Correctif disponible dès `3.3.18`, même branche majeure. [Avis](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [publication du mainteneur](https://github.com/ai/nanoid/releases/tag/3.3.18). |
| `source-map-js` | `1.2.1` → `1.2.2` | `postcss` et `@tailwindcss/node` → `source-map-js` | Outil Node de build. Des offsets de sections de source maps malveillants peuvent bloquer la boucle d’événements. Aucun upload métier de source map traité par cet outil. Le risque relève des entrées de build. | [Avis GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [publication du mainteneur](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2). Correctif `1.2.2`. |

Autres avis Axios couverts par `1.20.0` : [analyse data URI](https://github.com/advisories/GHSA-c29m-xwm3-cm6r), [normalisation des hôtes proxy](https://github.com/advisories/GHSA-mghh-pgcx-3jjj), [options toFormData](https://github.com/advisories/GHSA-x97p-jq2g-jp4f), [DNS/proxy HTTP2](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v), [initialisation HTTP2](https://github.com/advisories/GHSA-542g-h47m-68v8), [headers hérités](https://github.com/advisories/GHSA-j8rh-479h-cp32), [FormData/getHeaders](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2), [createConnection hérité](https://github.com/advisories/GHSA-m8m8-qj5v-23w3), [NO_PROXY/CIDR](https://github.com/advisories/GHSA-44g4-m2mj-wpvx).

## Contrôle du changement

Commande appliquée dans `frontend-web` :

```sh
npm update axios baseline-browser-mapping brace-expansion browserslist dompurify js-yaml nanoid source-map-js --package-lock-only --ignore-scripts --no-audit
```

Le [comportement documenté de npm 10](https://docs.npmjs.com/cli/v10/commands/npm-update/) respecte les contraintes des dépendances. Le lockfile contient 17 changements de version, aucun ajout/retrait de paquet, aucune montée majeure, aucune modification des plages racines ni de `package.json`. Les résolutions proviennent de `https://registry.npmjs.org/` et comportent leurs intégrités SHA-512. Les cinq instances imbriquées et l’instance racine de `brace-expansion` ont été contrôlées.

Quatre dépendances de données Browserslist évoluent également : `caniuse-lite` `1.0.30001792` → `1.0.30001815`, `electron-to-chromium` `1.5.357` → `1.5.449`, `node-releases` `2.0.44` → `2.0.57`, `update-browserslist-db` `1.2.3` → `1.3.3`. Aucun `npm audit fix --force`, override ou changement de framework.

La validation utilise Node `22.23.3` et npm `10.9.9`. Les versions corrigées sont compatibles avec cette version de Node.

## Installation et validation isolées

L’installation `npm ci --ignore-scripts --no-audit --fund=false` est exécutée dans une copie temporaire, avec un véritable `node_modules` indépendant. **Le `node_modules` du dépôt original et le serveur de développement 5173 ne sont pas remplacés pendant cette preuve.** Il faudra installer le lockfile validé avant le prochain démarrage habituel pour que cet environnement utilise les nouvelles versions.

L’API de la copie est explicitement `http://127.0.0.1:18081/api`, sur l’environnement backend isolé. Les tests navigateur ciblés interceptent les API métier ; les uploads binaires utilisent leurs récepteurs locaux. Le frontend de test utilise le port 5192. Les builds de déploiement utilisent une URL HTTPS explicite, sans token Sentry.

Commandes de validation :

```sh
npm ci --ignore-scripts --no-audit --fund=false
npm audit --json
npm test
npm run lint
VITE_API_BASE_URL=https://bx-connect-mvp1-preproduction.up.railway.app/api SENTRY_AUTH_TOKEN='' npm run build
```

Résultats : installation reproductible réussie ; audit zéro alerte ; **138 tests Node réussis, aucun échec ni ignoré** ; lint et build réussis ; **45 tests navigateur ciblés réussis, aucun échec, ignoré ou retry**. Ils couvrent les sessions/redirections Axios, les uploads multipart Chromium/WebKit et les rapports PDF/CSV FR/NL/EN. `npm ls` confirme également la cohérence de l’arbre installé. La suite navigateur globale est réservée à la réception du lot 8.

## Premier chargement mesuré et limites

Mesure initiale du 7 octobre : cinq nouveaux contextes navigateur par parcours et moteur, cache navigateur initialement vide, réseau local sans limitation, mesure 750 ms après le chargement. Le serveur et le système peuvent être chauds après le premier essai. Le preview utilisait le build préexistant ; il a été arrêté après mesure.

| Parcours | FCP médian Chromium, dev | FCP médian WebKit, dev | FCP médian Chromium, preview | FCP médian WebKit, preview |
|---|---:|---:|---:|---:|
| Accueil `/` | 480 ms | 492 ms sur 4 mesures disponibles | 212 ms | 195 ms |
| Catalogue `/projets` | 408 ms | 452 ms | 184 ms | 173 ms |

JavaScript transféré observé : environ 30,3 Mo en développement, contre 706 Ko dans le preview du build initial. Une mesure WebKit dev ne fournissait pas de métrique de peinture : elle reste absente, pas convertie en zéro. Le preview ciblait la configuration de déploiement existante ; ces chiffres mesurent l’affichage et les assets, pas une validation des workflows du serveur distant.

Le build après correctifs produit un chunk principal de 2 520,12 Ko, soit 715,14 Ko gzip. Les avertissements de chunk supérieur à 500 Ko et d’import simultanément statique/dynamique de `adminDashboardReport.js` subsistent. Ces résultats locaux ne montrent pas de blocage justifiant une refonte du chargement avant la défense. Aucune optimisation spéculative n’a été ajoutée. **Limite expliquée :** poids initial élevé ; performance distante, réseau lent et terminal modeste non validés par cette mesure. Les valeurs FCP ci-dessus précèdent les mises à jour ; elles ne constituent pas une comparaison avant/après de ces patches.
