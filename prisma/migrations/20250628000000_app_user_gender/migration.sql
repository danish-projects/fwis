-- Optional gender for section-scoped school admins (Boys/Girls access)
ALTER TABLE "app_users" ADD COLUMN "gender" TEXT;

ALTER TABLE "app_users" ADD CONSTRAINT "app_users_gender_fkey"
  FOREIGN KEY ("gender") REFERENCES "genders"("code") ON DELETE SET NULL ON UPDATE CASCADE;
