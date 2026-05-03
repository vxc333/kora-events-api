import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1714000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM('ADMIN', 'ORGANIZER')`);
    await queryRunner.query(`CREATE TYPE "user_plan_enum" AS ENUM('FREE', 'PRO', 'ENTERPRISE')`);

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password', type: 'varchar' },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'avatarUrl', type: 'varchar', isNullable: true },
          { name: 'role', type: 'user_role_enum', default: "'ORGANIZER'" },
          { name: 'isEmailVerified', type: 'boolean', default: false },
          { name: 'refreshToken', type: 'varchar', isNullable: true },
          { name: 'passwordResetToken', type: 'varchar', isNullable: true },
          { name: 'passwordResetExpires', type: 'timestamptz', isNullable: true },
          { name: 'plan', type: 'user_plan_enum', default: "'FREE'" },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
    await queryRunner.query(`DROP TYPE "user_plan_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
