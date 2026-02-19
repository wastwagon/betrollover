import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgeVerificationAndGeo1771342900000 implements MigrationInterface {
  name = 'AddAgeVerificationAndGeo1771342900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age_verified_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "date_of_birth"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "age_verified_at"`);
  }
}
