import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPartnerImpact } from './partnerSpace.helpers.js';

test('partner totals count accepted project declarations only', () => {
  const impact = buildPartnerImpact({
    statistiques: null,
    mesSoutiens: [
      { statutPaiement: 'PAYE', montant: 100, projetId: 1 },
      { statutPaiement: 'EN_ATTENTE', montant: 900, projetId: 2 },
      { statutPaiement: 'REMBOURSE', montant: 500, projetId: 3 },
    ],
  });
  assert.equal(impact.totalMontant, 100);
  assert.equal(impact.soutiensValides, 1);
  assert.equal(impact.projetsSoutenus, 1);
  assert.equal(impact.activitesSoutenues, 0);
});
