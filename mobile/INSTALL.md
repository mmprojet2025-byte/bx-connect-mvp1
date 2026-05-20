# BX-Connect Mobile — Instructions d'installation V4

## 1. Installer la dépendance Bottom Tab Navigator

```bash
cd /Users/mardo/bx-connect_mvp1/mobile
npx expo install @react-navigation/bottom-tabs
```

## 2. Copier les fichiers du ZIP

```bash
cp -r bx-connect-mobile/src/ /Users/mardo/bx-connect_mvp1/mobile/src/
cp bx-connect-mobile/App.js /Users/mardo/bx-connect_mvp1/mobile/
```

## 3. Lancer l'application

```bash
cd /Users/mardo/bx-connect_mvp1/mobile
npx expo start --web
```

## 4. Structure complète

```
mobile/
├── App.js
└── src/
    ├── api/
    │   └── axios.js
    ├── context/
    │   └── AuthContext.js
    ├── navigation/
    │   └── AppNavigator.js        ← Bottom Tab + Stack
    ├── screens/
    │   ├── HomeScreen.js          ← Accueil visiteur
    │   ├── LoginScreen.js         ← Connexion
    │   ├── RegisterScreen.js      ← Inscription
    │   ├── ActivitiesScreen.js    ← Activités
    │   ├── DashboardScreen.js     ← Tableau de bord
    │   ├── GroupesScreen.js       ← Groupes
    │   ├── MessagerieScreen.js    ← Messagerie (NOUVEAU)
    │   └── ProfileScreen.js       ← Profil
    └── components/
```

## 5. Navigation après connexion

```
Bottom Tab (membre connecté) :
🏠 Accueil | 🎯 Activités | 👥 Groupes | 💬 Messages | 👤 Profil
```