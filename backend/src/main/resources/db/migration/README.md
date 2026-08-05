# Flyway migrations

Flyway is now the source of truth for the BX-Connect database schema.
Hibernate must validate the schema, not mutate it automatically.

Normal backend configuration:

```properties
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.validate-on-migrate=true
spring.flyway.baseline-on-migrate=false
spring.flyway.clean-disabled=true
spring.jpa.hibernate.ddl-auto=validate
```

Do not use `spring.jpa.hibernate.ddl-auto=update` in production. Schema changes
must be explicit, reviewed, versioned Flyway migrations.

## Current migrations

- `V1__baseline_schema.sql`: baseline schema exported from the verified MySQL
  schema. It contains only DDL, no data, no users, no secrets.
- `V2__add_core_indexes.sql`: core indexes for common production queries
  such as notifications, messages, conversations, groups, projects, soutiens,
  and audit logs.
- `V3__add_password_reset_tokens.sql`: version des identifiants JWT et jetons
  de reinitialisation a usage unique, stockes uniquement sous forme de hash.

## New database

On an empty database, Flyway applies migrations in order:

1. `V1__baseline_schema.sql`
2. `V2__add_core_indexes.sql`
3. `V3__add_password_reset_tokens.sql`
4. future `V4__...`, `V5__...`, etc.

After the migrations run, Hibernate starts with `ddl-auto=validate` and checks
that the database schema matches the JPA entities.

## Existing local database

The existing local database `bxconnect_mvp1` was baselined once with Flyway so
that Flyway created `flyway_schema_history` without replaying `V1` on top of
the already existing schema.

That one-time baseline used a temporary runtime override only:

```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=1
spring.jpa.hibernate.ddl-auto=validate
```

This override must not remain in permanent configuration. Normal configuration
keeps:

```properties
spring.flyway.baseline-on-migrate=false
```

## Future schema changes

Every database evolution must be added as a new migration:

```text
V3__short_clear_description.sql
V4__short_clear_description.sql
```

Rules:

- never edit an already applied migration;
- never add `INSERT` statements with personal data, test accounts, messages, or
  secrets;
- avoid destructive operations unless they are planned, backed up, and tested;
- test on a disposable database before applying to real data;
- keep Hibernate on `ddl-auto=validate`.
