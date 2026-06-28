-- Allow authenticated users to read their own app_users row (middleware active check).
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_read_own ON app_users;
CREATE POLICY app_users_read_own ON app_users
  FOR SELECT
  USING (id = auth.uid());
