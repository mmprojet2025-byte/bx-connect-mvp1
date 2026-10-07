// Match the backend's declaration decision scope; never infer it from payment status alone.
export const isSupportDeclaration = support => support?.typeSource === 'DECLARATION'
  && support.projetId != null && support.activiteId == null

export const canDecideSupport = support => isSupportDeclaration(support)
  && support.statutPaiement === 'EN_ATTENTE'
