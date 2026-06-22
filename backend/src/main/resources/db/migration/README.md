# Flyway migrations

Flyway is prepared in the backend dependencies, but it is disabled by default
for the TFE/soutenance phase with:

```properties
spring.flyway.enabled=false
spring.jpa.hibernate.ddl-auto=update
```

This avoids changing the current local MySQL database, which has been built
incrementally by Hibernate `ddl-auto=update`.

## Later production path

1. Start from a clean copy or backup of the real MySQL database.
2. Export the real schema after verifying it matches the current JPA entities.
   Example direction:

   ```bash
   mysqldump --no-data --routines --triggers bxconnect_mvp1 > V1__baseline_schema.sql
   ```

3. Review the generated SQL manually:
   - remove environment-specific options if needed;
   - keep foreign keys, indexes, unique constraints, enum/string columns;
   - do not include local demo data or user secrets.
4. Place the reviewed file here as:

   ```text
   V1__baseline_schema.sql
   ```

5. Enable Flyway on a non-production copy first:

   ```properties
   spring.flyway.enabled=true
   spring.flyway.baseline-on-migrate=true
   ```

6. Once Flyway owns the schema safely, change Hibernate from:

   ```properties
   spring.jpa.hibernate.ddl-auto=update
   ```

   to:

   ```properties
   spring.jpa.hibernate.ddl-auto=validate
   ```

Do not add an empty or approximate migration. The first migration must come
from the real verified MySQL schema.
