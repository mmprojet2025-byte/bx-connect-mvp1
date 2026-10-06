package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class ProjetParticipationPaiementTest {
    final ProjetRepository projects = mock(ProjetRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final MembreGroupeRepository memberships = mock(MembreGroupeRepository.class);
    final ParticipationProjetRepository participants = mock(ParticipationProjetRepository.class);
    final ProjetParticipationPaiementRepository payments = mock(ProjetParticipationPaiementRepository.class);
    final NotificationService notifications = mock(NotificationService.class);
    final ProjetParticipationPaiementService service = new ProjetParticipationPaiementService(projects, users, memberships, participants, payments, notifications);
    User member; Projet project; ProjetParticipationPaiement payment;
    @BeforeEach void setup() {
        member = new User(); member.setId(1L); member.setRole(Role.MEMBRE); member.setActif(true);
        member.setEmail("member@example.org"); member.setPrenom("Alice"); member.setNom("Test");
        project = new Projet(); project.setId(2L); project.setTitre("Projet"); project.setPrixParticipation(new BigDecimal("5.00"));
        project.setStatut(StatutProjet.APPROUVE); project.setVisibilite(VisibiliteProjet.PUBLIC);
        when(users.findByEmail(member.getEmail())).thenReturn(Optional.of(member));
        when(projects.findByIdForUpdate(2L)).thenReturn(Optional.of(project));
        when(projects.findById(2L)).thenReturn(Optional.of(project));
        when(payments.saveAndFlush(any())).thenAnswer(i -> { ProjetParticipationPaiement p=i.getArgument(0); p.setId(3L); return p; });
        payment = service.prepare(2L, member.getEmail());
        when(payments.findById(3L)).thenReturn(Optional.of(payment));
        when(payments.findByIdForUpdate(3L)).thenReturn(Optional.of(payment));
        clearInvocations(payments);
    }
    Session session() {
        var s = new Session(); s.setId("cs_project_test"); s.setMode("payment"); s.setStatus("complete");
        s.setPaymentStatus("paid"); s.setCurrency("eur"); s.setAmountTotal(500L); s.setPaymentIntent("pi_project_test");
        s.setMetadata(Map.of("project_participation_payment_id", "3")); return s;
    }
    @Test void priceIsServerOwnedAndPendingRetryReusesSameAttempt() {
        when(payments.findByProjetIdOrderByDateCreationDesc(2L)).thenReturn(List.of(payment));
        assertThat(service.prepare(2L, member.getEmail())).isSameAs(payment);
        assertThat(payment.getMontant()).isEqualByComparingTo("5.00");
        verify(payments, never()).saveAndFlush(any());
        verify(participants, never()).save(any()); verifyNoInteractions(notifications);
    }
    @Test void pendingDoesNotGrantParticipationOrReceipt() {
        assertThatThrownBy(() -> service.receipt(3L, member.getEmail())).isInstanceOf(IllegalArgumentException.class);
        verify(participants, never()).save(any());
        assertThat(payment.getNumeroRecu()).isNull();
    }
    @Test void successfulReplayCreatesOneParticipationOneReceiptOneNotification() {
        service.handle(session(), true);
        var date = payment.getDatePaiement();
        service.handle(session(), true);
        var expired=session(); expired.setStatus("expired"); expired.setPaymentStatus("unpaid");
        service.handle(expired,false);
        assertThat(payment.getStatut()).isEqualTo(StatutPaiement.PAYE);
        assertThat(payment.getNumeroRecu()).isEqualTo("BX-PROJET-3");
        assertThat(payment.getDatePaiement()).isEqualTo(date);
        verify(participants, times(1)).save(any());
        verify(notifications, times(1)).creer(eq(member), anyString(), anyString(), eq("RECU_PROJET"), eq("/mes-factures?recu=3"));
    }
    @Test void receiptKeepsOriginalPriceTitleAndName() {
        project.setTitre("Changed"); member.setNom("Changed"); project.setPrixParticipation(BigDecimal.TEN);
        service.handle(session(),true);
        var r=service.receipt(3L, member.getEmail());
        assertThat(r.montant()).isEqualByComparingTo("5.00");
        assertThat(r.titreProjet()).isEqualTo("Projet");
        assertThat(r.participant()).isEqualTo("Alice Test");
    }
    @ParameterizedTest @ValueSource(strings={"unpaid","amount","currency","metadata","session","intent","mode","status"})
    void invalidProviderPaymentCannotConfirm(String field) {
        var s=session();
        switch(field) {
            case "unpaid" -> s.setPaymentStatus("unpaid");
            case "amount" -> s.setAmountTotal(1L);
            case "currency" -> s.setCurrency("usd");
            case "metadata" -> s.setMetadata(Map.of());
            case "session" -> payment.setStripeSessionId("cs_other");
            case "intent" -> s.setPaymentIntent(null);
            case "mode" -> s.setMode("setup");
            case "status" -> s.setStatus("open");
        }
        assertThatThrownBy(() -> service.handle(s,true)).isInstanceOf(RuntimeException.class);
        assertThat(payment.getStatut()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(participants,never()).save(any()); verifyNoInteractions(notifications);
    }
    @Test void expiredSessionAllowsNewAttemptWithoutDeletingHistory() {
        var s=session(); s.setStatus("expired"); s.setPaymentStatus("unpaid");
        service.handle(s,false);
        when(payments.findByProjetIdOrderByDateCreationDesc(2L)).thenReturn(List.of(payment));
        assertThat(service.prepare(2L, member.getEmail()).getRequestKey()).isNotEqualTo(payment.getRequestKey());
        verify(participants,never()).save(any());
    }
    @ParameterizedTest @ValueSource(strings={"ADMIN","REFERENT","PARTENAIRE","SUPER_ADMIN"})
    void nonMembersCannotCheckout(String role) {
        member.setRole(Role.valueOf(role));
        assertThatThrownBy(() -> service.prepare(2L,member.getEmail())).isInstanceOf(AccessDeniedException.class);
    }
    @ParameterizedTest @ValueSource(strings={"BROUILLON","SOUMIS","TERMINE","ARCHIVE"})
    void closedProjectsCannotCheckout(String status) {
        project.setStatut(StatutProjet.valueOf(status));
        assertThatThrownBy(() -> service.prepare(2L,member.getEmail())).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void inactiveMemberAndOtherGroupAreRejected() {
        member.setActif(false);
        assertThatThrownBy(() -> service.prepare(2L,member.getEmail())).isInstanceOf(AccessDeniedException.class);
        member.setActif(true); project.setVisibilite(VisibiliteProjet.GROUPE);
        Groupe group=new Groupe(); group.setId(4L); project.setGroupe(group);
        assertThatThrownBy(() -> service.prepare(2L,member.getEmail())).isInstanceOf(AccessDeniedException.class);
        var membership=new MembreGroupe(); membership.setGroupe(group);
        when(memberships.findFirstByUserIdAndStatut(1L,StatutMembre.ACCEPTE)).thenReturn(Optional.of(membership));
        assertThat(service.prepare(2L,member.getEmail()).getMontant()).isEqualByComparingTo("5.00");
    }
    @Test void otherMemberAndOtherReferentCannotReadReceiptsOrTransactions() {
        User other=new User(); other.setId(5L); other.setRole(Role.MEMBRE);
        when(users.findByEmail("other")).thenReturn(Optional.of(other));
        assertThatThrownBy(() -> service.receipt(3L,"other")).isInstanceOf(AccessDeniedException.class);
        other.setRole(Role.REFERENT);
        assertThatThrownBy(() -> service.forProject(2L,"other")).isInstanceOf(AccessDeniedException.class);
    }
    @Test void adminAndAssignedReferentCanReadPaidReceipt() {
        service.handle(session(),true);
        User other=new User(); other.setId(5L); other.setRole(Role.ADMIN);
        when(users.findByEmail("manager")).thenReturn(Optional.of(other));
        assertThat(service.receipt(3L,"manager").numeroRecu()).isEqualTo("BX-PROJET-3");
        other.setRole(Role.REFERENT);
        Groupe group=new Groupe(); group.setId(4L); group.setReferent(other); project.setGroupe(group);
        assertThat(service.receipt(3L,"manager").numeroRecu()).isEqualTo("BX-PROJET-3");
    }
    @Test void signedNewerWebhookUsesExistingStripeSessionAndRejectsBadSignature() throws Exception {
        var stripe=spy(new StripeService(mock(SoutienFinancierRepository.class), users, mock(ActiviteRepository.class), projects));
        ReflectionTestUtils.setField(stripe,"projectParticipationPayments",service);
        ReflectionTestUtils.setField(stripe,"webhookSecret","test-webhook-secret");
        String payload="""
            {"id":"evt_project_test","object":"event","api_version":"2026-09-30.endive","type":"checkout.session.completed","data":{"object":{"id":"cs_project_test","object":"checkout.session","metadata":{"project_participation_payment_id":"3"}}}}
            """;
        assertThatThrownBy(() -> stripe.traiterWebhook(payload,"t=1,v1=invalid")).isInstanceOf(RuntimeException.class);
        verify(participants,never()).save(any());
        doReturn(session()).when(stripe).lireSessionExterne("cs_project_test");
        long time=System.currentTimeMillis()/1000;
        var mac=javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec("test-webhook-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8),"HmacSHA256"));
        String signature=HexFormat.of().formatHex(mac.doFinal((time+"."+payload).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        stripe.traiterWebhook(payload,"t="+time+",v1="+signature);
        stripe.traiterWebhook(payload,"t="+time+",v1="+signature);
        assertThat(payment.getStatut()).isEqualTo(StatutPaiement.PAYE);
        verify(participants,times(1)).save(any());
    }

    @Test void fullProjectRejectsCheckoutIncludingPendingReservations() {
        project.setCapacite(2);
        when(participants.countByProjetId(2L)).thenReturn(1L);
        when(participants.countPendingPayments(2L)).thenReturn(1L);
        assertThatThrownBy(() -> service.prepare(2L, member.getEmail())).hasMessageContaining("complet");
        verify(payments, never()).saveAndFlush(any());
    }
    @Test void expiredDeadlineRejectsCheckout() {
        project.setDateLimiteParticipation(java.time.LocalDate.now(java.time.ZoneId.of("Europe/Brussels")).minusDays(1));
        assertThatThrownBy(() -> service.prepare(2L, member.getEmail())).hasMessageContaining("clôturées");
        verify(payments, never()).saveAndFlush(any());
    }
    @Test void reservedPaymentStillConfirmsAfterDeadline() {
        project.setCapacite(1);
        project.setDateLimiteParticipation(java.time.LocalDate.now().minusDays(1));
        service.handle(session(), true);
        assertThat(payment.getStatut()).isEqualTo(StatutPaiement.PAYE);
    }
}
