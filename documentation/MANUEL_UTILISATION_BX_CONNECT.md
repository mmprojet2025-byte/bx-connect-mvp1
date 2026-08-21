# Manuel d’utilisation de Bx-Connect

**Application réalisée dans le cadre d’un travail de fin d’études (TFE)**
**Contexte associatif : Bx-Jeunes Impact**
**Version du manuel : 1.0 — 20 août 2026**
**Version de l’application vérifiée : commit `b6ddaed`**

> Ce manuel décrit le produit minimum viable (MVP) actuellement présent dans le dépôt. Bx-Connect n’est pas présenté comme déjà déployé en production. Les exemples sont fictifs. Les écrans et données montrés lors d’une démonstration doivent également rester fictifs.

## Comment utiliser ce manuel

Ce document s’adresse aux utilisateurs de Bx-Connect, au promoteur, au jury du TFE et aux personnes qui devront présenter l’application.

Vous pouvez le lire de deux manières :

- commencer par les chapitres communs, puis suivre le chapitre correspondant à votre rôle ;
- utiliser directement la table des matières pour retrouver une action précise.

Les indications suivantes sont utilisées :

- **Web** : fonctionnalité disponible dans un navigateur internet ;
- **Mobile** : fonctionnalité présente dans l’application React Native/Expo ;
- **Commun** : comportement disponible sur les deux plateformes ;
- **Partiel** : l’écran existe, mais le parcours n’est pas complet ou ne doit pas être considéré comme opérationnel ;
- **Indisponible dans le MVP** : fonction volontairement masquée ou désactivée ;
- **À vérifier** : information qui dépend encore du futur déploiement ou d’une décision métier.

Les intitulés peuvent légèrement varier selon la langue ou la taille de l’écran.

## Table des matières

1. Présentation de Bx-Connect
2. Les cinq rôles
3. Découvrir l’application sans compte
4. Créer un compte, se connecter et sécuriser son accès
5. Fonctions communes aux utilisateurs connectés
6. Manuel du MEMBRE
7. Manuel du RÉFÉRENT
8. Manuel de l’ADMIN
9. Manuel du PARTENAIRE
10. Manuel du SUPER_ADMIN
11. Utiliser l’application mobile
12. Fonctionnalités indisponibles dans le MVP
13. Résolution des problèmes
14. Différences entre le web et le mobile
15. Matrice des permissions
16. Glossaire
17. Captures d’écran à préparer
18. Notes de vérification

---

## 1. Présentation de Bx-Connect

### 1.1 À quoi sert l’application ?

Bx-Connect est une application qui centralise plusieurs activités utiles au fonctionnement d’une communauté associative : groupes, activités, projets, adhésions, inscriptions, communications, soutiens et administration des comptes.

Son objectif est de donner à chaque personne un espace adapté à ses responsabilités. Un membre ne voit donc pas les mêmes outils qu’un référent ou qu’un administrateur.

Bx-Connect désigne l’application. **Bx-Jeunes Impact** désigne le contexte associatif dans lequel le projet a été imaginé.

### 1.2 À qui s’adresse Bx-Connect ?

L’application prévoit cinq catégories d’utilisateurs :

- les **MEMBRES**, qui rejoignent des groupes, participent aux activités et proposent des projets ;
- les **RÉFÉRENTS**, qui accompagnent leurs groupes et leurs membres ;
- les **ADMIN**, qui gèrent les opérations principales de la plateforme ;
- les **PARTENAIRES**, qui consultent les initiatives ouvertes et proposent des soutiens manuels ;
- les **SUPER_ADMIN**, qui gèrent principalement les administrateurs et les journaux d’audit.

Les visiteurs non connectés peuvent également consulter plusieurs informations publiques.

### 1.3 Version web et application mobile

La version web s’utilise dans un navigateur. Elle constitue actuellement la version de référence pour les parcours complets, notamment la récupération du mot de passe.

L’application mobile propose une navigation adaptée au téléphone. Elle reprend de nombreuses fonctions principales, mais certaines actions sont limitées ou présentées différemment.

> **À vérifier avant diffusion aux utilisateurs :** l’adresse web finale et la méthode de distribution de l’application mobile ne sont pas encore définies dans ce manuel.

[Capture à ajouter : page d’accueil publique de Bx-Connect, sans donnée personnelle]

---

## 2. Les cinq rôles

Le rôle est attribué au compte et détermine les écrans accessibles. Après la connexion, Bx-Connect redirige automatiquement l’utilisateur vers l’espace correspondant.

| Rôle | Mission principale | Espace d’arrivée |
|---|---|---|
| MEMBRE | Participer à la vie des groupes, activités et projets | Tableau de bord membre |
| RÉFÉRENT | Encadrer ses groupes, membres, activités et projets | Tableau de bord référent |
| ADMIN | Administrer les utilisateurs et les opérations métier | Tableau de bord administratif |
| PARTENAIRE | Consulter les initiatives et proposer des soutiens | Espace partenaire |
| SUPER_ADMIN | Gérer les administrateurs et consulter l’audit | Tableau de bord super-administrateur |

Un utilisateur ne doit pas partager son compte. Si une personne tente d’ouvrir une page réservée à un autre rôle, l’application doit la rediriger vers son espace autorisé ou lui refuser l’accès.

[Capture à ajouter : cinq tableaux de bord assemblés en une planche comparative, avec comptes fictifs]

---

## 3. Découvrir l’application sans compte

### 3.1 Consulter l’accueil

**Objectif :** comprendre le but de Bx-Connect et découvrir les contenus proposés.
**Rôle :** visiteur ou utilisateur connecté.
**Où :** page d’accueil du site web ou écran d’accueil public mobile.

1. Ouvrez Bx-Connect.
2. Parcourez la présentation générale.
3. Utilisez les liens proposés vers les activités, les projets ou la création d’un compte.

**Résultat attendu :** l’accueil affiche une présentation et des contenus publics disponibles.

**Difficultés possibles :** si le backend n’est pas accessible, certaines listes dynamiques peuvent rester vides ou afficher une erreur de connexion.

### 3.2 Consulter les activités

**Objectif :** découvrir les activités publiées avant de créer un compte.
**Où :** menu ou lien **Activités**.

1. Ouvrez la liste des activités.
2. Utilisez les filtres disponibles si nécessaire.
3. Sélectionnez une activité pour afficher son détail.
4. Connectez-vous si vous souhaitez vous y inscrire.

**Résultat attendu :** les informations publiques de l’activité sont affichées.

**Limite :** l’inscription exige un compte MEMBRE connecté.

[Capture à ajouter : catalogue public des activités et zone de filtres]

### 3.3 Consulter les groupes, projets et annonces

**Objectif :** découvrir les initiatives présentes dans Bx-Connect.
**Où :** liens **Groupes**, **Projets** et **Annonces** lorsqu’ils sont proposés dans l’interface.

1. Choisissez le type de contenu souhaité.
2. Parcourez la liste.
3. Ouvrez un élément pour consulter les détails disponibles.

**Résultat attendu :** la fiche sélectionnée s’affiche.

**Limites :** rejoindre un groupe, rejoindre un projet ou publier un commentaire demande une authentification et un rôle autorisé.

### 3.4 Consulter les documents légaux

Les conditions d’utilisation, la politique de confidentialité et les mentions légales sont accessibles depuis les écrans publics et depuis le profil.

1. Sélectionnez le document souhaité.
2. Lisez-le avant de créer un compte.
3. Revenez au formulaire d’inscription si vous acceptez les conditions demandées.

---

## 4. Créer un compte, se connecter et sécuriser son accès

### 4.1 Créer un compte MEMBRE

**Objectif :** obtenir un accès personnel aux fonctions réservées aux membres.
**Plateformes :** Web et Mobile.
**Où :** bouton **Créer un compte** ou écran **Inscription**.
**Conditions :** disposer d’une adresse électronique et accepter les documents légaux demandés.

1. Ouvrez l’écran d’inscription.
2. Indiquez votre prénom et votre nom.
3. Saisissez votre adresse électronique.
4. Choisissez un mot de passe d’au moins huit caractères contenant au minimum une lettre majuscule et un chiffre.
5. Confirmez le mot de passe.
6. Lisez les documents légaux proposés.
7. Cochez la case d’acceptation.
8. Validez le formulaire.

**Résultat attendu :** le compte est créé, l’utilisateur est connecté et dirigé vers le tableau de bord membre.

**Erreurs possibles :**

- champ obligatoire vide ;
- adresse électronique mal formée ou déjà utilisée ;
- mots de passe différents ;
- mot de passe ne respectant pas les règles ;
- documents légaux non acceptés ;
- service momentanément inaccessible.

[Capture à ajouter : formulaire d’inscription complété uniquement avec un exemple fictif]

### 4.2 Se connecter

**Objectif :** ouvrir son espace personnel.
**Plateformes :** Web et Mobile.
**Où :** écran **Connexion**.

1. Saisissez l’adresse électronique associée au compte.
2. Saisissez le mot de passe.
3. Activez, si nécessaire, l’icône permettant d’afficher temporairement le mot de passe.
4. Sélectionnez **Se connecter**.

**Résultat attendu :** Bx-Connect ouvre automatiquement l’espace du rôle attribué au compte.

**Erreurs possibles :** identifiants incorrects, compte désactivé, absence de connexion réseau ou serveur indisponible.

> Ne communiquez jamais votre mot de passe à une autre personne et ne l’affichez pas pendant une présentation.

### 4.3 Se déconnecter

**Objectif :** fermer la session sur l’appareil utilisé.
**Où :** profil ou commande de déconnexion proposée dans l’interface.

1. Ouvrez votre profil.
2. Sélectionnez **Déconnexion**.
3. Vérifiez que l’écran public ou la page de connexion réapparaît.

**Résultat attendu :** les informations d’authentification locales sont retirées et les pages privées ne sont plus accessibles.

### 4.4 Mot de passe oublié — version web recommandée

**Objectif :** demander un lien de réinitialisation.
**Plateforme recommandée :** Web.
**Où :** page de connexion, lien **Mot de passe oublié**.

1. Ouvrez le lien **Mot de passe oublié**.
2. Saisissez l’adresse électronique du compte.
3. Envoyez la demande.
4. Consultez la boîte de réception associée au compte.
5. Ouvrez le lien reçu et choisissez un nouveau mot de passe.

**Résultat attendu :** le web envoie une demande réelle au backend. La réception du courriel dépend de la configuration du service d’envoi.

**Erreurs ou limites possibles :** adresse incorrecte, courriel classé comme indésirable, lien expiré ou service d’envoi non configuré.

> **À vérifier :** l’envoi réel des courriels doit être validé dans l’environnement où Bx-Connect sera déployé.

### 4.5 Limite de la récupération sur mobile

L’écran mobile actuel vérifie seulement que l’adresse saisie ressemble à une adresse électronique et affiche ensuite un message de confirmation. Il n’envoie pas de demande au backend.

**Recommandation :** utilisez la version web pour une récupération réelle du mot de passe. Ne considérez pas la confirmation mobile comme la preuve qu’un courriel a été envoyé.

### 4.6 Modifier son mot de passe depuis le profil

**Objectif :** remplacer le mot de passe lorsque l’utilisateur connaît encore l’ancien.
**Plateformes :** Web et Mobile.
**Conditions :** être connecté et connaître le mot de passe actuel.

1. Ouvrez **Profil**.
2. Choisissez **Modifier le mot de passe**.
3. Saisissez l’ancien mot de passe.
4. Saisissez le nouveau mot de passe.
5. Confirmez l’action.

**Résultat attendu :** un message confirme la modification.

**Erreurs possibles :** ancien mot de passe incorrect, champ manquant, nouveau mot de passe non conforme ou problème réseau.

[Capture à ajouter : section Sécurité du profil, sans mot de passe visible]

---

## 5. Fonctions communes aux utilisateurs connectés

### 5.1 Comprendre la navigation web

Sur un grand écran, le menu principal se trouve à gauche. Il peut être réduit pour laisser davantage de place au contenu. Sur un écran étroit, un bouton ouvre un panneau de navigation.

Les rubriques dépendent du rôle. Le nom, l’adresse électronique et l’accès au profil apparaissent dans la partie inférieure du menu.

1. Sélectionnez une rubrique du menu.
2. Repérez l’élément actif.
3. Utilisez le logo Bx-Connect ou **Tableau de bord** pour revenir à l’accueil de votre espace.

**Résultat attendu :** la page choisie s’affiche sans donner accès aux rubriques d’un autre rôle.

[Capture à ajouter : menu web déployé et menu web réduit]

### 5.2 Comprendre la navigation mobile

L’application mobile utilise principalement une barre d’onglets au bas de l’écran. Les onglets changent selon le rôle. Des boutons de recherche et de notifications peuvent apparaître dans l’en-tête.

1. Touchez un onglet pour changer de rubrique.
2. Utilisez la flèche de retour dans un sous-écran.
3. Touchez la cloche pour consulter les notifications.
4. Touchez la loupe pour ouvrir la recherche globale.

### 5.3 Consulter le tableau de bord

**Objectif :** obtenir une vue résumée des informations importantes.
**Où :** **Tableau de bord** ou onglet **Accueil**.

1. Connectez-vous.
2. Consultez les indicateurs et raccourcis affichés.
3. Sélectionnez un raccourci pour ouvrir le détail correspondant.

Le contenu dépend du rôle et des données disponibles. Un tableau de bord vide ne signifie pas nécessairement une erreur : le compte peut ne pas encore être lié à un groupe ou à une activité.

### 5.4 Consulter et modifier le profil

**Objectif :** vérifier les informations du compte et ses préférences.
**Où :** **Profil**.

1. Ouvrez le profil.
2. Vérifiez le prénom, le nom, l’adresse électronique, le rôle et la langue.
3. Sélectionnez **Modifier**.
4. Modifiez uniquement les champs disponibles.
5. Enregistrez.

**Résultat attendu :** un message confirme l’enregistrement et les nouvelles informations apparaissent.

**Limites :**

- l’adresse électronique et le rôle ne sont pas nécessairement modifiables depuis ce formulaire ;
- le changement de photo est disponible sur le web ;
- sur mobile, le changement de photo est marqué comme prochainement disponible.

### 5.5 Changer la langue

Bx-Connect prend en charge le français, le néerlandais et l’anglais.

1. Ouvrez le profil.
2. Sélectionnez la préférence de langue.
3. Choisissez **Français**, **Nederlands** ou **English**.
4. Enregistrez si l’interface le demande.

**Résultat attendu :** les textes traduits de l’interface utilisent la langue choisie. Le choix est mémorisé sur l’appareil.

**Limite :** certains contenus rédigés par des utilisateurs, comme une annonce ou un projet, ne sont pas traduits automatiquement.

### 5.6 Gérer les notifications

**Objectif :** suivre les événements liés au compte.
**Où :** rubrique **Notifications** ou icône en forme de cloche.

1. Ouvrez les notifications.
2. Sélectionnez une notification pour la consulter.
3. Marquez-la comme lue si nécessaire.
4. Utilisez **Tout marquer comme lu** pour traiter l’ensemble.
5. Supprimez une notification uniquement si elle n’est plus utile.

**Résultat attendu :** le compteur de notifications non lues diminue.

**Erreur possible :** en cas de problème réseau, l’état lu/non lu peut ne pas être enregistré immédiatement.

[Capture à ajouter : liste de notifications fictives et badge mobile]

### 5.7 Rechercher et filtrer

Sur mobile, la loupe ouvre une recherche globale. Les catalogues, notamment les activités, disposent aussi de filtres.

1. Ouvrez la recherche ou la liste concernée.
2. Saisissez un mot significatif ou choisissez les filtres proposés.
3. Lancez la recherche.
4. Ouvrez un résultat.
5. Effacez les critères pour retrouver la liste complète.

**Résultat attendu :** seuls les éléments correspondant aux critères restent affichés.

> **À vérifier :** l’accès exact à une recherche globale équivalente dans l’interface web actuelle.

### 5.8 Comprendre les messages

- Un message vert ou positif confirme généralement une réussite.
- Un message rouge indique une erreur ou un refus.
- Un indicateur de chargement signifie que l’application attend une réponse.
- Une liste vide peut signifier qu’aucune donnée n’existe pour le compte.
- Une fenêtre de confirmation protège certaines actions sensibles.

Ne répétez pas immédiatement une action si un chargement est encore visible. En cas de doute, attendez quelques secondes puis actualisez l’écran.

---

## 6. Manuel du MEMBRE

### 6.1 Accéder au tableau de bord membre

**Objectif :** consulter un résumé de sa participation.
**Où :** **Tableau de bord** sur le web ou **Accueil** sur mobile.
**Condition :** être connecté avec le rôle MEMBRE.

1. Connectez-vous.
2. Vérifiez les informations présentées sur le tableau de bord.
3. Utilisez les raccourcis vers les groupes, activités ou projets.

**Résultat attendu :** les informations correspondant au compte membre sont affichées.

[Capture à ajouter : tableau de bord d’un membre fictif]

### 6.2 Consulter les groupes

**Objectif :** découvrir les groupes et connaître son lien avec chacun.
**Où :** rubrique **Mes groupes** ou **Groupes**.

1. Ouvrez la liste des groupes.
2. Consultez le nom et les informations de chaque groupe.
3. Ouvrez un groupe pour voir son espace.
4. Repérez l’état de votre adhésion lorsqu’il est affiché.

**Résultat attendu :** la liste distingue les groupes accessibles et l’état des demandes du membre.

### 6.3 Demander à rejoindre un groupe

**Objectif :** envoyer une demande d’adhésion au référent du groupe.
**Condition :** ne pas être déjà membre et ne pas avoir une demande incompatible en cours.

1. Ouvrez **Groupes**.
2. Choisissez le groupe souhaité.
3. Sélectionnez **Rejoindre** ou l’action équivalente.
4. Confirmez si l’application le demande.

**Résultat attendu :** la demande passe en attente. Le membre n’est pas automatiquement accepté.

**Erreurs possibles :** demande déjà existante, groupe indisponible, utilisateur non autorisé ou problème réseau.

[Capture à ajouter : bouton Rejoindre et état de demande en attente]

### 6.4 Suivre une demande d’adhésion

1. Revenez dans la rubrique des groupes.
2. Consultez l’état affiché : en attente, acceptée ou refusée.
3. Si la demande est acceptée, ouvrez l’espace du groupe et la messagerie associée.

**Résultat attendu :** l’état correspond à la décision prise par le référent ou l’administrateur.

**Limite :** le délai de traitement dépend de l’organisation. **À vérifier :** délai métier conseillé pour répondre à une demande.

### 6.5 Quitter un groupe

**Objectif :** mettre fin à son adhésion.
**Condition :** être membre du groupe.

1. Ouvrez le groupe concerné.
2. Sélectionnez **Quitter**.
3. Lisez la confirmation.
4. Confirmez uniquement si vous souhaitez réellement partir.

**Résultat attendu :** le groupe n’apparaît plus parmi les groupes rejoints et l’accès à ses fonctions privées peut être retiré.

### 6.6 Consulter et filtrer les activités

1. Ouvrez **Activités**.
2. Parcourez les cartes disponibles.
3. Utilisez les filtres proposés.
4. Ouvrez le détail d’une activité.

**Résultat attendu :** la description, les dates et les informations disponibles sont affichées.

### 6.7 S’inscrire à une activité

**Objectif :** réserver sa participation.
**Condition :** être connecté comme MEMBRE et remplir les conditions prévues par l’activité.

1. Ouvrez le détail de l’activité.
2. Vérifiez la date et les informations utiles.
3. Sélectionnez **S’inscrire**.
4. Attendez le message de confirmation.

**Résultat attendu :** l’activité est ajoutée aux inscriptions du membre.

**Erreurs possibles :** inscription déjà existante, activité indisponible, capacité atteinte ou action refusée par le serveur.

[Capture à ajouter : détail fictif d’une activité avant et après inscription]

### 6.8 Se désinscrire d’une activité

1. Ouvrez l’activité à laquelle vous êtes inscrit.
2. Sélectionnez **Se désinscrire**.
3. Confirmez l’action.

**Résultat attendu :** l’inscription est retirée.

**Limite :** ne supposez pas que l’annulation est encore possible le jour même ; la règle métier doit être confirmée par l’organisation.

### 6.9 Créer et soumettre un projet

**Objectif :** proposer une initiative.
**Où :** rubrique **Projets**.
**Condition :** être connecté comme MEMBRE et disposer des informations demandées.

1. Ouvrez **Projets**.
2. Choisissez l’action de création.
3. Complétez les champs obligatoires.
4. Associez le projet au contexte proposé par l’interface.
5. Enregistrez puis soumettez le projet.

**Résultat attendu :** le projet est créé puis placé dans le workflow de suivi ou de validation.

**Erreurs possibles :** champ manquant, groupe non éligible, image refusée ou problème réseau.

> La publication définitive d’un projet peut dépendre d’une validation. La création ne garantit pas une mise en avant immédiate.

[Capture à ajouter : formulaire de projet avec contenu entièrement fictif]

### 6.10 Rejoindre et commenter un projet

1. Ouvrez un projet accessible.
2. Sélectionnez **Rejoindre** si l’action est proposée.
3. Consultez les commentaires.
4. Rédigez un commentaire respectueux et lié au projet.
5. Publiez-le.

**Résultat attendu :** la participation et le commentaire sont enregistrés.

**Erreurs possibles :** participation déjà enregistrée, projet non ouvert ou commentaire vide.

### 6.11 Utiliser la messagerie du groupe

**Objectif :** communiquer dans le fil du groupe.
**Où :** **Messagerie**.
**Condition :** appartenir à un groupe disposant d’un fil accessible.

1. Ouvrez la messagerie.
2. Sélectionnez le fil du groupe.
3. Consultez les messages existants.
4. Saisissez un nouveau message.
5. Envoyez-le.

**Résultat attendu :** le message apparaît dans le fil.

**Erreurs possibles :** aucun groupe associé, fil indisponible, message vide ou connexion interrompue.

---

## 7. Manuel du RÉFÉRENT

### 7.1 Consulter le tableau de bord référent

Le tableau de bord rassemble les groupes suivis, les membres, les demandes, les activités et les projets utiles au référent.

1. Connectez-vous avec un compte RÉFÉRENT.
2. Consultez les indicateurs.
3. Ouvrez l’élément nécessitant une action.

**Résultat attendu :** seules les données liées au périmètre du référent sont présentées.

[Capture à ajouter : tableau de bord référent avec données fictives]

### 7.2 Consulter ses groupes et leurs membres

**Où :** **Mes groupes** et **Membres**.

1. Ouvrez la liste des groupes.
2. Sélectionnez un groupe.
3. Consultez ses membres et ses demandes.
4. Vérifiez que vous intervenez sur le bon groupe avant toute action.

**Résultat attendu :** les membres rattachés au groupe sont affichés.

### 7.3 Accepter ou refuser une demande d’adhésion

**Objectif :** traiter les demandes des membres.
**Où :** rubrique **Demandes d’adhésion**.
**Condition :** le groupe doit relever du référent.

1. Ouvrez les demandes.
2. Sélectionnez le groupe concerné.
3. Vérifiez la demande et les informations strictement nécessaires.
4. Choisissez **Accepter** ou **Refuser**.
5. Confirmez la décision.

**Résultat attendu :** la demande change d’état. En cas d’acceptation, le membre rejoint le groupe.

**Précaution :** ne prenez pas une décision sur le mauvais groupe et ne partagez pas les informations du demandeur.

[Capture à ajouter : traitement d’une adhésion avec identité fictive]

### 7.4 Créer ou modifier une activité

**Objectif :** organiser une activité liée au périmètre du référent.
**Où :** **Activités à préparer** ou **Activités**.

1. Ouvrez la gestion des activités.
2. Choisissez **Créer** ou ouvrez une activité existante.
3. Complétez le titre, la description, les dates et les autres champs proposés.
4. Vérifiez les informations.
5. Enregistrez.

**Résultat attendu :** l’activité est créée ou mise à jour.

**Erreurs possibles :** dates incohérentes, champ obligatoire vide, format d’image refusé ou autorisation insuffisante.

### 7.5 Gérer les présences

**Objectif :** enregistrer la participation réelle après une activité.
**Où :** activité concernée, puis **Présences**.

1. Ouvrez la liste des activités.
2. Sélectionnez la feuille de présence.
3. Vérifiez la liste des inscrits.
4. Indiquez les présences ou absences.
5. Enregistrez les modifications.
6. Clôturez la feuille uniquement lorsque les informations sont définitives.

**Résultat attendu :** les présences sont enregistrées et la clôture finalise le relevé selon le workflow prévu.

**Précaution :** contrôlez la liste avant la clôture ; une action clôturée peut être difficile à corriger.

[Capture à ajouter : feuille de présence fictive avant clôture]

### 7.6 Créer et suivre les projets de ses groupes

1. Ouvrez **Projets**.
2. Consultez les projets associés à vos groupes.
3. Créez un projet ou ouvrez un projet existant.
4. Modifiez les informations autorisées.
5. Utilisez uniquement les actions de traitement proposées dans l’interface actuelle.

**Résultat attendu :** le projet suit le workflow actif de création, soumission et traitement.

**Limite importante :** d’anciennes opérations backend de validation/refus sont explicitement bloquées. Le référent ne doit pas essayer d’utiliser une URL ou une procédure ancienne absente de l’interface.

### 7.7 Communiquer avec les membres

**Où :** **Messagerie**.

1. Sélectionnez un groupe.
2. Ouvrez ou créez le fil lorsque l’interface l’autorise.
3. Consultez les messages.
4. Envoyez une information au groupe.

Le référent peut gérer le fil dans les limites prévues, tandis que le membre y participe.

### 7.8 Utiliser les conversations professionnelles

La rubrique **Conversations** est distincte de la messagerie de groupe. Elle sert aux échanges professionnels autorisés entre référents, partenaires, administrateurs et super-administrateurs.

1. Ouvrez **Conversations**.
2. Sélectionnez une conversation existante.
3. Consultez son historique.
4. Envoyez un message.
5. Marquez la conversation comme lue si nécessaire.

### 7.9 Limites du RÉFÉRENT

Le référent ne gère pas l’ensemble des utilisateurs de la plateforme, ne crée pas les administrateurs et ne doit pas accéder aux journaux du SUPER_ADMIN. Les rapports avancés, l’impact avancé, les prestations et certaines fonctions partenaires sont masqués dans le MVP.

---

## 8. Manuel de l’ADMIN

### 8.1 Consulter le tableau de bord administratif

**Objectif :** surveiller les principaux volumes et les éléments en attente.
**Où :** **Tableau de bord**.

1. Connectez-vous avec le rôle ADMIN.
2. Consultez les groupes, activités, projets et demandes en attente.
3. Ouvrez la rubrique nécessitant une intervention.

[Capture à ajouter : tableau de bord administratif avec données fictives]

### 8.2 Gérer les utilisateurs

**Objectif :** administrer les comptes métier.
**Où :** **Utilisateurs**.

1. Ouvrez la liste.
2. Recherchez l’utilisateur concerné.
3. Vérifiez son rôle et son état.
4. Choisissez l’action autorisée : changement de rôle, activation, désactivation ou suppression.
5. Lisez la confirmation.
6. Validez uniquement après une seconde vérification.

**Résultat attendu :** la liste reflète le nouvel état.

**Risques :** une désactivation bloque l’accès ; une suppression peut être irréversible. Utilisez toujours un compte fictif pendant une démonstration.

[Capture à ajouter : liste d’utilisateurs fictifs et fenêtre de confirmation]

### 8.3 Gérer les référents

1. Ouvrez **Référents**.
2. Consultez les référents existants.
3. Créez un référent si nécessaire en complétant les champs demandés.
4. Associez ensuite les responsabilités prévues via la gestion des groupes.

**Résultat attendu :** le nouveau compte référent apparaît dans la liste.

### 8.4 Gérer et valider les groupes

1. Ouvrez **Groupes** ou **Groupes en attente**.
2. Consultez les informations du groupe.
3. Validez ou refusez une demande de groupe.
4. Pour un groupe validé, choisissez un référent disponible si nécessaire.
5. Confirmez l’affectation.

**Résultat attendu :** l’état du groupe et son référent sont mis à jour.

**Erreurs possibles :** groupe déjà traité, référent invalide ou conflit de mise à jour.

[Capture à ajouter : validation d’un groupe fictif et affectation d’un référent]

### 8.5 Gérer les activités

1. Ouvrez **Activités**.
2. Créez une activité ou sélectionnez-en une.
3. Modifiez les informations nécessaires.
4. Changez son statut uniquement si le workflow le permet.
5. Consultez la feuille de présence pour le suivi des inscrits.
6. Supprimez une activité uniquement après confirmation.

**Résultat attendu :** les changements apparaissent dans la liste et, selon le statut, dans le catalogue visible.

### 8.6 Gérer les projets

1. Ouvrez **Projets à valider** ou **Projets**.
2. Consultez le détail d’un projet.
3. Vérifiez son auteur, son groupe et son contenu sans exposer de données inutiles.
4. Approuvez, refusez ou changez le statut selon les actions proposées.
5. Confirmez les actions sensibles.

**Résultat attendu :** le projet adopte le nouvel état.

### 8.7 Traiter les soutiens manuels

**Objectif :** examiner les propositions de soutien émises par les partenaires.
**Où :** **Soutiens**.

1. Ouvrez la liste des soutiens.
2. Consultez la proposition et son contexte.
3. Choisissez l’action de validation ou de refus disponible.
4. Ajoutez un commentaire administratif si le formulaire le prévoit.
5. Confirmez.

**Résultat attendu :** le statut du soutien est mis à jour.

> Un soutien manuel est une déclaration de contribution ou d’accompagnement enregistrée dans Bx-Connect. Ce n’est pas un paiement en ligne. Aucun transfert d’argent Stripe ou PayPal ne doit être annoncé.

[Capture à ajouter : traitement d’un soutien manuel fictif]

### 8.8 Gérer les annonces et opportunités

1. Ouvrez **Annonces**.
2. Consultez les annonces accessibles.
3. Créez ou gérez une annonce si votre écran le permet.
4. Pour une opportunité soumise par un partenaire, choisissez publier ou refuser.
5. Épinglez une annonce uniquement si elle doit être mise en avant.

### 8.9 Statistiques et modules masqués

Le tableau de bord fournit des statistiques opérationnelles. En revanche, le tableau d’impact avancé et certaines statistiques étendues sont masqués dans le MVP et ne doivent pas être présentés comme disponibles.

---

## 9. Manuel du PARTENAIRE

### 9.1 Ouvrir l’espace partenaire

L’espace partenaire regroupe le tableau de bord, les projets ouverts, les activités ouvertes, les soutiens, les conversations et les notifications.

1. Connectez-vous avec un compte PARTENAIRE.
2. Consultez le résumé du tableau de bord.
3. Utilisez les onglets ou rubriques pour changer de domaine.

[Capture à ajouter : espace partenaire, onglet Tableau de bord]

### 9.2 Consulter et modifier le profil partenaire

1. Ouvrez le profil ou la section institutionnelle proposée.
2. Consultez les informations enregistrées.
3. Choisissez **Modifier**.
4. Complétez les champs autorisés.
5. Enregistrez.

**Résultat attendu :** le profil partenaire est mis à jour.

**À vérifier :** processus métier exact de validation initiale d’un nouveau partenaire.

### 9.3 Consulter les projets et activités ouverts

1. Ouvrez **Projets ouverts** ou **Activités ouvertes**.
2. Parcourez les éléments disponibles.
3. Ouvrez une fiche pour comprendre son objectif.
4. Sélectionnez l’action de soutien seulement si vous souhaitez réellement proposer une contribution.

### 9.4 Proposer un soutien manuel

**Objectif :** signaler une proposition de soutien à un projet ou une activité.
**Condition :** être connecté comme PARTENAIRE.

1. Ouvrez l’initiative concernée.
2. Choisissez l’action de soutien.
3. Complétez les informations demandées.
4. Relisez la proposition.
5. Envoyez-la.

**Résultat attendu :** le soutien apparaît dans **Mes soutiens** et peut être examiné par l’administration.

**Limite essentielle :** cette action ne débite aucune carte et n’effectue aucun paiement en ligne.

[Capture à ajouter : formulaire de soutien manuel avec exemple fictif]

### 9.5 Suivre, modifier ou annuler un soutien

1. Ouvrez **Mes soutiens**.
2. Consultez le statut de chaque proposition.
3. Ouvrez un soutien modifiable.
4. Corrigez les informations ou choisissez **Annuler**.
5. Confirmez.

**Résultat attendu :** l’état ou le contenu est actualisé si le workflow autorise encore l’action.

### 9.6 Consulter les relations et statistiques

L’espace peut afficher les référents liés, les groupes associés, un aperçu d’impact local et des statistiques du partenaire.

1. Ouvrez le tableau de bord ou l’onglet concerné.
2. Consultez les relations et indicateurs disponibles.
3. Signalez à l’administration toute association incorrecte.

### 9.7 Publier une opportunité

1. Ouvrez la rubrique permettant de proposer une opportunité.
2. Complétez le formulaire.
3. Envoyez la proposition.
4. Attendez la décision administrative.

**Résultat attendu :** l’opportunité est enregistrée pour traitement ; elle n’est pas nécessairement publiée immédiatement.

### 9.8 Communiquer

Le partenaire utilise **Conversations** pour les échanges professionnels et **Notifications** pour suivre les événements du compte. Il n’utilise pas la messagerie interne réservée aux groupes MEMBRE/RÉFÉRENT.

### 9.9 Limites du PARTENAIRE

Le partenaire ne gère pas les comptes, les groupes ou les rôles. Les paiements Stripe et PayPal sont désactivés. Les affectations avancées restent masquées dans le MVP.

---

## 10. Manuel du SUPER_ADMIN

### 10.1 Comprendre la différence avec l’ADMIN

L’ADMIN pilote les opérations métier : utilisateurs, référents, groupes, activités, projets et soutiens.

Le SUPER_ADMIN se concentre sur :

- les comptes administrateurs ;
- la consultation globale en lecture seule de certains utilisateurs métier ;
- les journaux d’audit ;
- les conversations professionnelles autorisées.

### 10.2 Consulter le tableau de bord

1. Connectez-vous avec le rôle SUPER_ADMIN.
2. Consultez les indicateurs généraux.
3. Ouvrez la gestion des administrateurs ou les journaux selon le besoin.

[Capture à ajouter : tableau de bord super-administrateur]

### 10.3 Gérer les administrateurs

**Objectif :** créer et contrôler les comptes ADMIN.
**Où :** rubrique **Administrateurs**.

1. Ouvrez la liste des administrateurs.
2. Pour créer un compte, sélectionnez **Ajouter**.
3. Complétez uniquement les informations requises.
4. Enregistrez.
5. Pour un compte existant, choisissez activer, désactiver ou réinitialiser le mot de passe.
6. Vérifiez une seconde fois le compte ciblé avant confirmation.

**Résultat attendu :** l’état du compte administrateur est mis à jour.

**Précaution :** une erreur peut bloquer l’accès d’un administrateur. Ne réalisez jamais cette démonstration sur un compte réel indispensable.

[Capture à ajouter : liste d’administrateurs fictifs et confirmation d’une action]

### 10.4 Consulter les utilisateurs métier

Le SUPER_ADMIN dispose d’une consultation en lecture seule des membres, référents et partenaires dans l’écran prévu. Il ne doit pas utiliser cet écran comme remplacement de la gestion métier de l’ADMIN.

### 10.5 Consulter les journaux d’audit

**Objectif :** rechercher des traces d’actions importantes.
**Où :** rubrique **Journaux**.

1. Ouvrez les journaux.
2. Consultez les événements récents.
3. Utilisez la recherche et les critères disponibles.
4. Vérifiez l’événement recherché.
5. Ne diffusez pas les informations affichées en dehors des personnes autorisées.

**Résultat attendu :** les événements correspondant aux critères sont présentés.

**Limite :** un journal aide à comprendre une action, mais ne constitue pas à lui seul une preuve complète de l’identité réelle d’une personne.

[Capture à ajouter : recherche dans les journaux avec données entièrement fictives]

---

## 11. Utiliser l’application mobile

### 11.1 Installation et lancement

Le projet mobile repose sur React Native et Expo. Le dépôt contient les commandes de développement, mais aucune publication officielle sur l’App Store ou le Google Play Store n’est confirmée.

> **À vérifier :** canal de distribution retenu pour les futurs utilisateurs. Une démonstration technique peut nécessiter Expo ou une version construite spécialement.

### 11.2 Navigation par rôle

- MEMBRE : accueil, activités, projets, réseau ou groupes, messagerie, notifications et profil selon la navigation affichée ;
- RÉFÉRENT : tableau de bord, outils de groupe, activités, projets, messagerie et demandes ;
- ADMIN : tableau de bord, gestion, activités, conversations, notifications et profil ;
- PARTENAIRE : tableau de bord, projets, activités, conversations, notifications et profil ;
- SUPER_ADMIN : tableau de bord, gestion, conversations, notifications, profil et accès aux journaux.

Certains écrans secondaires sont ouverts depuis le tableau de bord plutôt que depuis un onglet visible en permanence.

[Capture à ajouter : barre d’onglets mobile pour chacun des cinq rôles]

### 11.3 Connexion et stockage de la session

1. Ouvrez l’application.
2. Sélectionnez **Connexion**.
3. Saisissez les identifiants.
4. Validez.
5. Vérifiez le rôle affiché dans l’en-tête ou le profil.

L’application conserve la session dans un stockage sécurisé prévu à cet effet. Déconnectez-vous après une démonstration sur un appareil partagé.

### 11.4 Recherche et notifications mobiles

La loupe ouvre la recherche globale. La cloche ouvre les notifications et peut afficher un badge indiquant le nombre d’éléments non lus.

### 11.5 Comportement avec une connexion instable

Certaines informations peuvent être relues depuis un cache local en lecture seule. Une donnée provenant du cache peut ne pas refléter la toute dernière modification du serveur.

1. Vérifiez la connexion internet.
2. Relancez l’écran.
3. Évitez de répéter plusieurs fois une action d’écriture.
4. Contrôlez le résultat lorsque la connexion revient.

### 11.6 Limites mobiles connues

- récupération du mot de passe : écran partiel, utiliser le web ;
- modification de la photo : annoncée comme prochainement disponible ;
- installation publique : non confirmée ;
- certaines fonctions de gestion sont regroupées différemment du web ;
- les modules masqués du MVP ne doivent pas être utilisés.

---

## 12. Fonctionnalités indisponibles dans le MVP

| Fonction | État actuel | Consigne utilisateur |
|---|---|---|
| Paiement Stripe | Désactivé et masqué | Ne pas chercher à payer par carte |
| Paiement PayPal | Désactivé et masqué | Ne pas chercher à payer avec PayPal |
| Historique de paiements en ligne | Masqué | Ne pas le confondre avec les soutiens manuels |
| Prestations bénévoles avancées | Masquées | Ne pas les présenter en démonstration MVP |
| Rapports avancés du référent | Masqués | Utiliser uniquement les écrans accessibles |
| Tableau d’impact avancé | Masqué | Ne pas annoncer comme fonction disponible |
| Affectations partenaires avancées | Masquées | Passer par les fonctions MVP visibles |
| Changement de photo sur mobile | Partiel | Utiliser le web si nécessaire |
| Mot de passe oublié sur mobile | Partiel | Utiliser la version web |
| Publication App Store/Play Store | Non confirmée | Ne pas promettre une installation publique |

Le code de certains modules peut encore être présent sans que la fonction soit accessible. La présence d’un fichier ou d’un ancien écran ne signifie pas que l’utilisateur peut l’utiliser dans le MVP.

---

## 13. Résolution des problèmes

### 13.1 Identifiants incorrects

1. Vérifiez l’adresse électronique.
2. Vérifiez que les majuscules du mot de passe sont correctes.
3. Utilisez l’icône d’affichage du mot de passe uniquement dans un lieu privé.
4. Si nécessaire, utilisez la récupération du mot de passe sur le web.

### 13.2 Compte désactivé

Un compte désactivé ne peut plus accéder normalement à l’application.

1. Ne créez pas immédiatement un second compte.
2. Contactez la personne responsable de l’administration de Bx-Connect.
3. Demandez une vérification de l’état du compte.

> **À vérifier :** canal d’assistance officiel à communiquer aux utilisateurs.

### 13.3 Accès refusé ou mauvaise page

1. Vérifiez le rôle indiqué dans le profil.
2. Revenez au tableau de bord.
3. Utilisez le menu normal plutôt qu’une ancienne adresse enregistrée.
4. Si le problème persiste, signalez la page et le rôle utilisés sans communiquer votre mot de passe.

### 13.4 Demande d’adhésion en attente

Une demande en attente doit être traitée par un référent ou un administrateur autorisé. N’envoyez pas plusieurs fois la même demande.

### 13.5 Aucune donnée affichée

Une liste vide peut être normale : aucun groupe lié, aucune activité publiée, aucun soutien ou aucune notification.

1. Vérifiez les filtres.
2. Effacez la recherche.
3. Actualisez l’écran.
4. Vérifiez que le compte utilise le bon rôle.

### 13.6 Problème de connexion

1. Vérifiez l’accès à internet.
2. Attendez quelques instants.
3. Relancez l’écran.
4. Sur mobile, tenez compte du fait que certaines informations peuvent provenir du cache.
5. Ne répétez pas rapidement une création, une inscription ou un message.

### 13.7 Courriel de réinitialisation non reçu

1. Vérifiez que la demande a été faite sur le web.
2. Vérifiez l’adresse saisie.
3. Consultez les courriers indésirables.
4. Attendez quelques minutes.
5. Demandez une vérification de la configuration d’envoi si aucun message n’arrive.

### 13.8 Image ou fichier refusé

Le backend accepte les images JPG, PNG ou WEBP et refuse notamment les fichiers vides, trop volumineux ou dont le contenu n’est pas une image autorisée. La limite contrôlée par le backend est de 5 Mo.

1. Vérifiez que le fichier est une image.
2. Vérifiez qu’il ne dépasse pas 5 Mo.
3. Convertissez-le en JPG, PNG ou WEBP si nécessaire.
4. Réessayez.

N’utilisez jamais une image contenant des données bancaires, des secrets, des documents d’identité ou des informations personnelles inutiles.

### 13.9 Activité ou projet impossible à modifier

Vérifiez le rôle, le statut de l’élément et son groupe. Une action peut devenir indisponible après une validation, un refus ou une clôture.

### 13.10 Paiement introuvable

C’est le comportement attendu du MVP : Stripe et PayPal sont désactivés. Utilisez uniquement le parcours de soutien manuel lorsqu’il est proposé au PARTENAIRE.

---

## 14. Tableau des différences entre le web et le mobile

| Fonction | Web | Mobile | Recommandation |
|---|---|---|---|
| Accueil public | Disponible | Disponible | Utiliser l’interface préférée |
| Inscription | Disponible | Disponible | Parcours comparables |
| Connexion/déconnexion | Disponible | Disponible | Se déconnecter sur un appareil partagé |
| Mot de passe oublié | Demande backend réelle | Écran partiel sans demande backend | Utiliser le web |
| Modification du mot de passe | Disponible | Disponible | Ancien mot de passe requis |
| Profil | Disponible | Disponible | Vérifier l’enregistrement |
| Photo de profil | Téléversement disponible | Fonction annoncée prochainement | Utiliser le web |
| Langues FR/NL/EN | Disponible | Disponible | Contenus utilisateurs non traduits automatiquement |
| Notifications | Disponible | Disponible avec badge | Connexion nécessaire pour synchroniser |
| Recherche globale | Accès à confirmer | Disponible par la loupe | Privilégier le mobile pour cette fonction identifiée |
| Groupes | Disponible | Disponible | Présentation différente |
| Activités | Disponible | Disponible | Actions selon le rôle |
| Projets | Disponible | Disponible | Workflow selon le rôle |
| Messagerie de groupe | Disponible | Disponible | MEMBRE et RÉFÉRENT |
| Conversations professionnelles | Disponible | Disponible | Rôles métier autorisés |
| Administration avancée | Plus détaillée | Regroupée dans des écrans de gestion | Privilégier le web pour une démonstration complète |
| Paiements en ligne | Indisponibles | Indisponibles | Ne pas les présenter |

---

## 15. Matrice des permissions par rôle

Légende : **Oui** = disponible ; **Limité** = uniquement sur son périmètre ou en lecture seule ; **Non** = non autorisé ; **MVP masqué** = présent partiellement dans le code mais non accessible.

| Action | MEMBRE | RÉFÉRENT | ADMIN | PARTENAIRE | SUPER_ADMIN |
|---|---:|---:|---:|---:|---:|
| Consulter/modifier son profil | Oui | Oui | Oui | Oui | Oui |
| Modifier son mot de passe | Oui | Oui | Oui | Oui | Oui |
| Consulter les notifications | Oui | Oui | Oui | Oui | Oui |
| Consulter les groupes publics | Oui | Oui | Oui | Selon espace | Limité |
| Demander à rejoindre un groupe | Oui | Non | Non | Non | Non |
| Quitter un groupe | Oui | Non | Non | Non | Non |
| Traiter les adhésions | Non | Ses groupes | Oui | Non | Non |
| Consulter les membres d’un groupe | Non | Ses groupes | Oui | Non | Lecture globale limitée |
| Créer ou modifier une activité | Non | Son périmètre | Oui | Non | Non |
| S’inscrire à une activité | Oui | Non | Non | Non | Non |
| Gérer les présences | Non | Son périmètre | Oui | Non | Non |
| Créer un projet | Oui | Oui | Oui | Non | Non |
| Rejoindre un projet | Oui | Non | Non | Non | Non |
| Commenter un projet | Oui | Oui | Oui | Oui | Non confirmé |
| Traiter les projets | Non | Son périmètre et workflow actif | Oui | Non | Non |
| Messagerie de groupe | Oui | Oui | Non | Non | Non |
| Conversations professionnelles | Non | Oui | Oui | Oui | Oui |
| Proposer un soutien manuel | Non | Non | Non | Oui | Non |
| Traiter un soutien manuel | Non | Non | Oui | Non | Non |
| Gérer les utilisateurs métier | Non | Non | Oui | Non | Lecture seule limitée |
| Gérer les référents et groupes | Non | Non | Oui | Non | Non |
| Gérer les comptes ADMIN | Non | Non | Non | Non | Oui |
| Consulter les journaux d’audit | Non | Non | Non | Non | Oui |
| Paiement Stripe ou PayPal | MVP masqué | MVP masqué | MVP masqué | MVP masqué | MVP masqué |
| Rapports/impact avancés | MVP masqué | MVP masqué | MVP masqué | MVP masqué | MVP masqué |

Cette matrice résume l’interface actuelle. Les contrôles du backend restent la référence de sécurité : masquer un bouton ne remplace pas une autorisation serveur.

---

## 16. Glossaire

**ADMIN** : administrateur chargé des opérations métier de Bx-Connect.

**Adhésion** : demande ou état indiquant qu’un membre appartient à un groupe.

**Application mobile** : version de Bx-Connect conçue avec React Native/Expo pour un appareil mobile.

**Application web** : version de Bx-Connect utilisée dans un navigateur internet.

**Backend** : partie de l’application qui applique les règles, contrôle les autorisations et communique avec la base de données.

**Bx-Jeunes Impact** : contexte associatif du projet Bx-Connect.

**Conversation professionnelle** : échange distinct de la messagerie de groupe, réservé aux rôles métier autorisés.

**Fil de discussion** : espace regroupant les messages d’un groupe.

**Journal d’audit** : historique technique de certaines actions importantes, consultable par le SUPER_ADMIN.

**MEMBRE** : utilisateur participant aux groupes, activités et projets.

**MVP** : « produit minimum viable », c’est-à-dire la première version fonctionnelle retenue pour valider les fonctions essentielles.

**Notification** : information signalant un événement lié au compte.

**PARTENAIRE** : organisation ou utilisateur partenaire pouvant consulter des initiatives et proposer des soutiens manuels.

**RÉFÉRENT** : personne qui accompagne et gère son périmètre de groupes et de membres.

**Rôle** : niveau d’autorisation attribué à un compte.

**Soutien manuel** : proposition enregistrée par un partenaire, sans transfert d’argent automatique.

**SUPER_ADMIN** : rôle chargé principalement des administrateurs et des journaux d’audit.

**Tableau de bord** : écran d’accueil privé qui résume les informations importantes d’un rôle.

---

## 17. Captures d’écran à préparer

Toutes les captures doivent utiliser des comptes fictifs. Masquez les adresses électroniques, identifiants, jetons, chemins locaux et informations personnelles inutiles.

### Captures générales

1. Accueil public web.
2. Catalogue et filtres d’activités.
3. Formulaire d’inscription avec exemple fictif.
4. Écran de connexion.
5. Mot de passe oublié sur le web.
6. Menu web ouvert et réduit.
7. Navigation mobile.
8. Profil et choix de langue.
9. Notifications web et badge mobile.
10. Exemple de message de réussite et d’erreur.

### MEMBRE

11. Tableau de bord.
12. Liste des groupes.
13. Demande d’adhésion et état en attente.
14. Détail d’une activité et inscription.
15. Formulaire de projet.
16. Messagerie de groupe.

### RÉFÉRENT

17. Tableau de bord.
18. Membres d’un groupe.
19. Traitement d’une demande d’adhésion.
20. Création d’une activité.
21. Feuille de présence avant clôture.
22. Gestion des projets.
23. Conversations professionnelles.

### ADMIN

24. Tableau de bord administratif.
25. Gestion des utilisateurs.
26. Confirmation d’une activation ou désactivation.
27. Gestion des référents.
28. Validation d’un groupe et affectation.
29. Gestion des activités.
30. Validation d’un projet.
31. Traitement d’un soutien manuel.
32. Gestion d’une opportunité.

### PARTENAIRE

33. Tableau de bord partenaire.
34. Profil partenaire.
35. Projets et activités ouverts.
36. Proposition de soutien manuel.
37. Liste et statut des soutiens.
38. Création d’une opportunité.

### SUPER_ADMIN

39. Tableau de bord.
40. Gestion des administrateurs.
41. Confirmation d’une action sensible.
42. Recherche dans les journaux d’audit.

### Mobile

43. Barre d’onglets MEMBRE.
44. Barre d’onglets RÉFÉRENT.
45. Barre d’onglets ADMIN.
46. Barre d’onglets PARTENAIRE.
47. Barre d’onglets SUPER_ADMIN.
48. Recherche globale mobile.

---

## 18. Notes de vérification

Ce manuel a été établi à partir des routes, menus, écrans et appels d’API présents dans la version indiquée en page de garde, puis confronté aux autorisations des contrôleurs backend.

Les principaux comportements vérifiés concernent :

- l’authentification et la redirection selon le rôle ;
- la gestion du profil et du mot de passe ;
- les groupes et adhésions ;
- les activités, inscriptions et présences ;
- les projets et commentaires ;
- les messageries et notifications ;
- les espaces ADMIN, PARTENAIRE et SUPER_ADMIN ;
- la désactivation par défaut des paiements ;
- les différences de navigation entre le web et le mobile.

### Informations encore à vérifier avant une diffusion opérationnelle

1. Adresse finale de la version web.
2. Méthode officielle d’installation de l’application mobile.
3. Disponibilité et configuration du service d’envoi de courriels.
4. Canal officiel d’assistance aux utilisateurs.
5. Délai métier conseillé pour traiter une adhésion.
6. Règle métier d’annulation tardive d’une inscription à une activité.
7. Processus exact de validation initiale d’un partenaire.
8. Accès exact à la recherche globale dans la version web.
9. Comptes fictifs retenus pour les démonstrations et captures.

Toute évolution importante des routes, des rôles ou du MVP devra entraîner une nouvelle relecture du manuel.
