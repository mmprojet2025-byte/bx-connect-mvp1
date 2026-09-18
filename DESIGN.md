# BX-Connect Mobile — Brief de conception Google Stitch

## 1. Périmètre et objectif

Ce document concerne exclusivement l’application mobile **BX-Connect**, développée avec React Native et Expo `~57.0.21`. Il ne décrit pas le frontend web et ne demande aucune modification du backend.

BX-Connect est un produit de gestion associative qui met en relation les jeunes et membres, les référents de groupes, les partenaires et l’équipe administrative. L’application facilite l’accès aux groupes, activités gratuites, projets, échanges et informations utiles selon le rôle de la personne connectée.

Google Stitch doit produire des **maquettes mobiles** fidèles aux écrans, parcours, rôles et règles décrits ici. Les propositions peuvent améliorer la hiérarchie visuelle, la lisibilité et la cohérence, mais elles ne doivent ni modifier la logique métier, ni inventer des fonctionnalités, ni réactiver les paiements d’activité.

Direction attendue : **simple, colorée, professionnelle, chaleureuse et crédible pour un véritable produit de gestion associatif**. Éviter l’apparence d’un réseau social générique, d’une application bancaire ou d’un tableau de bord d’entreprise froid.

## 2. Identité visuelle existante à conserver

### Ressources de marque

- Logo principal : `mobile/assets/images/logo-bx-connect.png`.
- Fichier existant mais non utilisé sur l’écran Welcome actuel : `mobile/assets/images/welcome-community.jpg`.
- Icône et splash : `mobile/assets/icon.png` et `mobile/assets/splash-icon.png`.
- Icônes Android adaptatives : `mobile/assets/android-icon-foreground.png`, `android-icon-background.png` et `android-icon-monochrome.png`.
- Illustrations disponibles : activités, communauté, groupes, messages et projets dans `mobile/assets/illustrations/`.
- Visuels et placeholders existants : activités, groupes, messages, notifications et projets dans `mobile/assets/images/` et `mobile/src/assets/images/placeholders/`.

Les maquettes doivent réutiliser le logo et l’esprit visuel existant. La photographie `welcome-community.jpg` ne doit pas être utilisée sur Welcome. Ne pas créer une nouvelle marque, un nouveau logo ou une mascotte.

### Palette

| Usage | Couleur |
|---|---|
| Bleu BX principal | `#1E3A8A` |
| Bleu interactif | `#2563EB` |
| Orange d’impact et appel principal | `#F97316` |
| Succès | `#22C55E` |
| Avertissement | `#F59E0B` |
| Erreur ou danger | `#EF4444` |
| Information | `#38BDF8` |
| Texte principal | `#111827` |
| Texte secondaire | `#64748B` |
| Fond de page | `#F3F4F6` |
| Surface | `#FFFFFF` |
| Bordure | `#E5E7EB` |
| Fonds teintés | bleu `#EFF6FF`, orange `#FFF7ED`, vert `#F0FDF4`, rouge `#FEF2F2`, jaune `#FFFBEB`, violet `#F5F3FF` |

Le bleu structure la navigation et l’identité. L’orange attire l’attention sur les actions publiques prioritaires, notamment « Créer un compte ». Les couleurs d’état doivent toujours être accompagnées d’un texte ou d’une icône explicite.

## 3. Système de design mobile

### Typographie

Utiliser la police système native, sans introduire une famille décorative. Respecter l’échelle existante :

- Hero : 26 px, interligne 32 px, graisse 800.
- Titre de page : 21 px, interligne 27 px, graisse 700.
- Titre de section : 17 px, interligne 22 px, graisse 700.
- Corps : 14 px, interligne 20 px.
- Légende : 14 px, interligne 19 px.
- Petit texte : 12 px, interligne 16 px.
- Libellé d’onglet : 10 px, interligne 13 px, graisse 600.

Conserver une hiérarchie courte et nette. Autoriser l’agrandissement du texte système et éviter les hauteurs fixes pour les blocs textuels.

### Espacements, formes et élévation

- Échelle d’espacement : 4, 8, 12, 16, 20 et 24 px.
- Marge latérale habituelle : 16 à 24 px selon l’écran.
- Rayons : 10, 12 et 14 px ; utiliser 999 px pour les badges en pilule.
- Cartes : fond blanc, bordure `#E5E7EB`, rayon 14 px, ombre légère et contenu aéré.
- L’ombre reste discrète ; la bordure doit suffire à distinguer une carte.
- Fond général gris clair `#F3F4F6`, avec surfaces blanches.

### Boutons

- Action principale publique : fond orange, texte blanc, hauteur minimale 52 px.
- Action principale dans l’espace privé : bleu interactif, texte blanc.
- Action secondaire : fond bleu BX ou surface blanche avec bordure selon le contexte.
- Action tertiaire : texte bleu, sans conteneur lourd.
- Action destructive : rouge, avec libellé explicite et confirmation si l’action est irréversible.
- État désactivé visiblement distinct, mais texte toujours lisible.
- Zone tactile minimale : 44 × 44 px.
- Chaque bouton doit avoir un verbe précis ; ne pas dépendre uniquement d’une icône.

### Cartes, listes et badges

- Utiliser les motifs existants `Card`, `ActionCard`, `StatCard`, `SectionHeader`, `Badge` et `Avatar`.
- Les cartes d’action associent une icône teintée, un titre, une courte description et éventuellement un chevron.
- Les cartes statistiques affichent une valeur dominante, un libellé bref et une couleur sémantique.
- Les badges servent aux statuts métier. Ils restent courts, lisibles et accompagnés du statut écrit.
- Les listes doivent conserver un rythme vertical compact, des séparateurs ou cartes identifiables et une action principale évidente.

### Formulaires

- Libellé visible au-dessus de chaque champ ; le placeholder ne remplace pas le libellé.
- Champs pleine largeur, surface blanche, bordure neutre, rayon cohérent et hauteur tactile suffisante.
- États focus, rempli, désactivé et erreur clairement différenciés.
- Message d’erreur placé près du champ et résumé global si plusieurs erreurs empêchent l’envoi.
- Clavier et type de saisie adaptés ; les formulaires doivent rester visibles avec le clavier ouvert.
- Les sélecteurs, cases et contrôles de langue doivent exposer leur état sélectionné.

### Icônes

Utiliser **Ionicons**, déjà employé par `AppIcon`. Les icônes sémantiques existantes couvrent notamment accueil, activité, groupe, projet, profil, message, notification, recherche, sécurité, modification, envoi et avertissement. Employer le même pictogramme pour une même action dans toute l’application. Une icône seule doit avoir un libellé accessible.

### États d’interface

Chaque écran chargé depuis l’API doit disposer d’états distincts :

- chargement avec indicateur et libellé ;
- contenu disponible ;
- liste vide avec explication et action pertinente si elle existe ;
- erreur technique avec message et bouton de nouvelle tentative ;
- succès après une action ;
- action en cours et bouton temporairement indisponible ;
- session expirée renvoyant proprement vers la connexion.

Ne jamais représenter une erreur réseau par une liste vide ou un compteur à zéro. Réutiliser les composants `LoadingState`, `EmptyState` et `ErrorState`.

## 4. Navigation mobile existante

L’application utilise React Navigation avec une pile publique et une navigation privée par onglets. La session détermine quel arbre est affiché.

### Espace public

L’écran initial est **Welcome**. Il utilise un arrière-plan clair avec des formes abstraites pâles, sans photographie ni illustration communautaire. Le logo BX-Connect est centré et agrandi. L’écran reste direct, sans slogan ni long texte de présentation, et propose le choix de langue ainsi que trois chemins :

1. Bouton orange « Créer un compte » → inscription.
2. Bouton bleu « Se connecter » → connexion puis espace privé du rôle.
3. Lien « Découvrir sans compte » → accueil public, activités et groupes consultables.

La pile publique contient aussi la récupération de mot de passe ainsi que les conditions, la confidentialité et les mentions légales. Les retours depuis la connexion et l’inscription ramènent à Welcome sans boucle.

### Espace privé

- En-tête blanc, titre sombre, bordure basse, recherche lorsque disponible et bouton de notifications avec badge.
- Barre d’onglets blanche, icône et libellé, bleu pour l’onglet actif et gris pour l’inactif.
- La barre se masque avec le clavier.
- Certaines destinations secondaires sont accessibles depuis le tableau de bord ou l’en-tête et ne doivent pas devenir des onglets supplémentaires.

## 5. Parcours et espaces par rôle

### MEMBRE

- Accueil membre personnalisé.
- Réseau : groupes et projets.
- Activités gratuites : consultation, inscription, annulation et réinscription selon disponibilité.
- Messagerie.
- Profil et préférences, dont la langue.
- Notifications accessibles depuis l’en-tête.
- Projet : créer un brouillon, modifier son propre projet dans les états permis, soumettre, corriger et resoumettre le même projet. Une resoumission ne crée pas de doublon.

### RÉFÉRENT

- Tableau de bord.
- Réseau : groupes et projets de son périmètre.
- Activités gratuites.
- Messagerie avec les membres et conversations professionnelles.
- Outils de traitement des demandes et consultation des membres de ses groupes.
- Profil et notifications.
- Les actions doivent rester limitées aux groupes dont la personne est référente.

### PARTENAIRE

- Tableau de bord partenaire.
- Projets consultables.
- Activités gratuites consultables, sans paiement d’activité.
- Conversations professionnelles.
- Soutiens de projets déclaratifs et opportunités accessibles depuis le tableau de bord.
- Profil de l’institution partenaire, profil utilisateur et notifications.
- Un soutien déclaré ne doit jamais être présenté comme un paiement encaissé.

### ADMIN

- Tableau de bord administratif.
- Gestion : utilisateurs, groupes, demandes de groupes, référents, projets soumis, soutiens partenaires déclaratifs et opportunités.
- Activités gratuites.
- Conversations professionnelles.
- Profil et notifications.
- Le traitement administratif reste soumis aux permissions et transitions existantes.

### SUPER_ADMIN

- Tableau de bord technique.
- Gestion des comptes administrateurs.
- Journaux d’audit.
- Sécurité des comptes.

Cet espace possède quatre onglets dédiés et ne doit pas reprendre visuellement toutes les fonctions de l’ADMIN.

## 6. Inventaire des écrans mobiles existants

### Écrans publics et communs

- `WelcomeScreen` : porte d’entrée publique et choix de langue.
- `HomeScreen` : découverte sans compte.
- `LoginScreen` : connexion.
- `RegisterScreen` : création de compte.
- `ForgotPasswordScreen` : demande réelle de récupération de mot de passe.
- `LegalScreen` : conditions, confidentialité et mentions.
- `ActivitiesScreen` : catalogue et gestion des activités selon le rôle.
- `GroupesScreen` : groupes et adhésions selon le rôle.
- `ProfileScreen` : compte, préférences et déconnexion.
- `NotificationsScreen` : notifications.
- `GlobalSearchScreen` : recherche globale privée.
- `AnnoncesScreen` : annonces accessibles depuis les espaces privés.

### MEMBRE et RÉFÉRENT

- `MemberHomeScreen` : accueil du membre.
- `ProjectsScreen` : liste, création et mise à jour des projets selon les droits.
- `MessagerieScreen` : messagerie membres/référents.
- `ReferentRequestsScreen` : demandes à traiter par le référent.
- `ReferentMembersScreen` : membres des groupes du référent.

### PARTENAIRE et conversations professionnelles

- `PartnerSupportsScreen` : soutiens déclaratifs aux projets et opportunités.
- `PartnerProfileScreen` : profil de l’institution.
- `BusinessConversationsScreen` : conversations professionnelles.

### ADMIN et SUPER_ADMIN

- `DashboardScreen` : tableau de bord selon le rôle.
- `AdminUsersScreen` : utilisateurs et comptes administratifs selon le rôle.
- `AdminPendingGroupsScreen` : groupes en attente.
- `AdminOpportunitiesScreen` : opportunités.
- `AdminReferentsScreen` : référents.
- `AdminPartnerSupportsScreen` : décisions sur les soutiens déclaratifs de projets.
- `AdminSubmittedProjectsScreen` : projets soumis.
- `SuperAdminLogsScreen` : journaux d’audit.
- `SuperAdminAccountSecurityScreen` : sécurité des comptes.

### Fichiers d’écran présents mais hors navigation active

`PaymentScreen`, `PaymentHistoryScreen` et `PrestationsMobileScreen` existent dans le code source mais ne sont pas reliés au navigateur actuel. Ils ne doivent pas générer de maquettes fonctionnelles ni suggérer un paiement. Dans cette version, les activités sont gratuites et tous les paiements d’activité Stripe/PayPal sont fermés.

## 7. Responsive sur téléphones

- Concevoir d’abord pour une largeur utile d’environ 360 à 430 px, tout en supportant les petits téléphones dès 320 px.
- Conserver le mode portrait défini par l’application.
- Sur petit écran, empiler les actions et cartes qui ne tiennent pas sans réduire le texte.
- Sur grand téléphone, limiter la largeur des formulaires et contenus de lecture à environ 420–480 px et les centrer.
- Autoriser le retour à la ligne des titres, libellés d’onglets et boutons ; ne pas tronquer une action essentielle.
- Les grilles de deux cartes ne restent en deux colonnes que si chaque carte conserve une largeur et une zone tactile lisibles.
- Prévoir les claviers, les messages système, les textes agrandis et les libellés néerlandais souvent plus longs.
- `app.json` annonce le support iPad, mais ce brief vise des maquettes téléphone ; sur écran plus large, centrer le contenu plutôt que l’étirer.

## 8. Accessibilité, zones sûres et mouvement

- Respecter les zones sûres en haut, en bas et autour des encoches avec `SafeAreaView`/safe-area-context.
- Ne placer aucune action derrière la barre système, l’indicateur d’accueil ou le clavier.
- Taille tactile minimale de 44 × 44 px et espacement suffisant entre actions.
- Contraste lisible pour texte, icônes, bordures et états ; ne jamais coder une information par la couleur seule.
- Fournir des libellés accessibles, rôles, états sélectionnés/cochés et indications pour les commandes non textuelles.
- Préserver un ordre de lecture logique et des titres explicites pour les lecteurs d’écran.
- Les erreurs et succès importants doivent être annoncés et rester visibles assez longtemps.
- Accepter l’agrandissement de texte sans chevauchement ni disparition d’action.
- Le comportement existant de Welcome respecte **Reduce Motion**. Étendre cette règle à toutes les maquettes : si la préférence système est active, supprimer les transitions décoratives et afficher directement l’état final. Aucun sens, statut ou accès ne doit dépendre d’une animation.

## 9. Langues FR, NL et EN

L’application utilise i18next avec trois langues : français par défaut, néerlandais et anglais. Le choix est conservé localement et peut être effectué dès Welcome.

- Toutes les chaînes visibles doivent provenir des traductions, sans texte métier figé dans une seule langue.
- Fournir les maquettes principales en français et vérifier les variantes avec des libellés néerlandais et anglais.
- Prévoir l’expansion du texte, notamment dans les boutons, onglets, badges et messages d’erreur.
- Conserver la même structure, les mêmes fonctions et la même hiérarchie dans les trois langues.
- Ne pas utiliser de drapeau pour représenter une langue ; afficher FR, NL et EN ou leurs noms.

## 10. Livrables demandés à Google Stitch

Produire une bibliothèque cohérente de composants et des maquettes téléphone pour :

1. Welcome et les principaux écrans publics.
2. Connexion, inscription et récupération du compte.
3. La navigation privée et ses variations pour les cinq rôles.
4. Les états principaux des groupes, activités gratuites, projets, soutiens déclaratifs, messages, notifications et profil.
5. Les états chargement, vide, erreur, succès, désactivé et session expirée.
6. Les formulaires et dialogues nécessaires aux actions déjà présentes.

Les maquettes doivent rester compatibles avec React Native/Expo et les composants existants. Elles servent de référence visuelle : **Google Stitch ne doit produire ni changement de logique métier, ni nouvel endpoint, ni nouveau rôle, ni paiement, ni fonctionnalité absente de cet inventaire**.
