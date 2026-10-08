package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.entity.Activite;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** Activity dates are Brussels wall-clock times; Stripe expects epoch seconds. */
public final class ActivityCheckoutWindow {
    public static final long MINIMUM_SECONDS = 31 * 60;
    private static final ZoneId ZONE = ZoneId.of("Europe/Brussels");
    private ActivityCheckoutWindow() {}

    public static LocalDateTime now(Clock clock) { return LocalDateTime.ofInstant(clock.instant(), ZONE); }

    public static Instant closesAt(Activite activity) {
        var deadline = activity.getDateLimiteInscription() == null
                ? activity.getDateDebut() : activity.getDateLimiteInscription();
        return deadline == null ? null : deadline.atZone(ZONE).toInstant();
    }

    public static Instant checkoutDeadline(Activite activity) {
        var closes = closesAt(activity);
        return closes == null ? null : closes.minusSeconds(MINIMUM_SECONDS);
    }

    public static boolean canOpen(Activite activity, Clock clock) {
        var deadline = checkoutDeadline(activity);
        return deadline != null && !clock.instant().isAfter(deadline);
    }

    public static long expiresAt(Activite activity, Clock clock) {
        return Math.min(clock.instant().getEpochSecond() + 3600, closesAt(activity).getEpochSecond());
    }
}
