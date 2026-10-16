INSERT INTO providers (
    user_id,
    provider_type,
    business_name,
    rating,
    trust_score,
    cancellation_rate,
    verification_status
)
SELECT
    u.id,
    'EQUIPMENT_OWNER',
    u.name || '''s Farm Services',
    0,
    50,
    0,
    'PENDING'
FROM users u
WHERE u.role = 'PROVIDER'
  AND NOT EXISTS (
      SELECT 1
      FROM providers p
      WHERE p.user_id = u.id
  );
