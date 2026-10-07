# Réalignement des responsables d'activités après changement de référent

Cette procédure prépare une reprise ciblée. **Aucune reprise de la base originale
n'est autorisée implicitement par le correctif de code.** Obtenir l'accord explicite
avant de l'exécuter sur cette base, même pour des données de démonstration.

## Préparer et contrôler

1. Identifier le backend, son profil, son URL JDBC et le nom de la base ; ne pas se
   fier uniquement à l'URL du navigateur.
2. Sauvegarder la base et les uploads hors Git, puis vérifier la restauration dans
   une base isolée. Ne jamais publier les secrets ou les sauvegardes.
3. Rechercher les désalignements, en lecture seule :

```sql
SELECT g.id AS groupe_id, g.statut AS groupe_statut, g.actif AS groupe_actif,
       g.referent_id AS responsable_actuel, u.role, u.actif AS referent_actif,
       a.id AS activite_id, a.statut AS activite_statut,
       a.referent_assigne_id, a.createur_id
FROM groupes g
JOIN activites a ON a.groupe_id = g.id
LEFT JOIN utilisateurs u ON u.id = g.referent_id
WHERE NOT (a.referent_assigne_id <=> g.referent_id)
ORDER BY g.id, a.id;
```

4. Vérifier le responsable souhaité pour chaque groupe. Un groupe archivé ne doit
   pas être réactivé ou réaffecté pour corriger son historique. Les groupes sans
   référent actif de rôle `REFERENT` demandent une décision administrative préalable.

## Reprendre avec le mécanisme métier existant

Sur la copie isolée d'abord, utiliser la réaffectation ADMIN existante :

```text
PATCH /api/admin/groupes/{groupeId}/referent/{referentActuelId}
Authorization: Bearer <jeton ADMIN de l'environnement ciblé>
```

Sélectionner les identifiants constatés, sans les coder dans une migration.
Réattribuer le même référent actuel est volontairement autorisé : cette opération
réaligne les activités existantes du groupe dans la même transaction, même si le
groupe avait déjà le bon référent. Elle ne crée aucune activité, ne change aucun
statut et ne remplace pas l'auteur historique (`createur_id`).

L'audit métier `GROUP_REFERENT_ASSIGNED` conserve les référents précédent et actuel.
Consigner séparément les groupes approuvés pour la reprise, l'environnement,
l'heure, le résultat HTTP et les contrôles effectués, sans jeton ni donnée sensible.

## Vérifier les effets

- Réexécuter la requête de diagnostic pour les groupes repris.
- Vérifier que les auteurs, statuts, dates, inscriptions et présences sont inchangés.
- Appeler les listes, fiches et modifications autorisées avec le nouveau référent.
- Vérifier le refus de gestion pour l'ancien référent et un référent extérieur.
- Vérifier qu'une activité terminée ou annulée reste non modifiable, même par ADMIN.
- Répéter la même réaffectation : aucune activité ni inscription supplémentaire.

Après preuve sur la copie et accord explicite, appliquer uniquement la liste
approuvée à la base originale. Aucun `UPDATE` SQL manuel ni changement Flyway
n'est nécessaire pour cette reprise.
