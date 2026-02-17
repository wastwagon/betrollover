import { MigrationInterface, QueryRunner } from "typeorm";

export class ProductionSchemaFix1771342800000 implements MigrationInterface {
    name = 'ProductionSchemaFix1771342800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Fix Users Table (Add missing columns for verification)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" VARCHAR(64)`);

        // 2. Create Tipsters Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tipsters" (
                "id" SERIAL PRIMARY KEY,
                "username" VARCHAR(50) UNIQUE NOT NULL,
                "display_name" VARCHAR(100) NOT NULL,
                "avatar_url" VARCHAR(255),
                "bio" TEXT,
                "is_ai" BOOLEAN DEFAULT false,
                "tipster_type" VARCHAR(20),
                "personality_profile" JSONB,
                "total_predictions" INT DEFAULT 0,
                "total_wins" INT DEFAULT 0,
                "total_losses" INT DEFAULT 0,
                "win_rate" DECIMAL(5,2) DEFAULT 0,
                "roi" DECIMAL(8,2) DEFAULT 0,
                "current_streak" INT DEFAULT 0,
                "best_streak" INT DEFAULT 0,
                "total_profit" DECIMAL(10,2) DEFAULT 0,
                "avg_odds" DECIMAL(6,2) DEFAULT 0,
                "last_prediction_date" TIMESTAMP,
                "join_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "is_active" BOOLEAN DEFAULT true,
                "user_id" INT,
                "leaderboard_rank" INT,
                "monthly_roi" DECIMAL(8,2) DEFAULT 0,
                "monthly_predictions" INT DEFAULT 0,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Create Predictions Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "predictions" (
                "id" SERIAL PRIMARY KEY,
                "tipster_id" INT NOT NULL REFERENCES "tipsters"("id") ON DELETE CASCADE,
                "prediction_title" VARCHAR(200),
                "combined_odds" DECIMAL(8,2) NOT NULL,
                "stake_units" DECIMAL(5,2) DEFAULT 1,
                "confidence_level" VARCHAR(20),
                "status" VARCHAR(20) DEFAULT 'pending',
                "source" VARCHAR(50) DEFAULT 'internal',
                "prediction_date" DATE NOT NULL,
                "posted_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "settled_at" TIMESTAMP,
                "actual_result" DECIMAL(10,2),
                "roi_contribution" DECIMAL(8,2),
                "views" INT DEFAULT 0,
                "likes" INT DEFAULT 0,
                "comments_count" INT DEFAULT 0,
                "followers_who_placed" INT DEFAULT 0,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Create Prediction Fixtures Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "prediction_fixtures" (
                "id" SERIAL PRIMARY KEY,
                "prediction_id" INT NOT NULL REFERENCES "predictions"("id") ON DELETE CASCADE,
                "fixture_id" INT NOT NULL,
                "match_date" TIMESTAMP NOT NULL,
                "league_name" VARCHAR(100),
                "league_id" INT,
                "home_team" VARCHAR(100) NOT NULL,
                "away_team" VARCHAR(100) NOT NULL,
                "selected_outcome" VARCHAR(20),
                "selection_odds" DECIMAL(6,2) NOT NULL,
                "result_status" VARCHAR(20) DEFAULT 'pending',
                "actual_score" VARCHAR(20),
                "ai_probability" DECIMAL(5,4),
                "expected_value" DECIMAL(6,4),
                "leg_number" INT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Create Tipster Follows Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tipster_follows" (
                "id" SERIAL PRIMARY KEY,
                "user_id" INT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "tipster_id" INT NOT NULL REFERENCES "tipsters"("id") ON DELETE CASCADE,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("user_id", "tipster_id")
            )
        `);

        // 6. Create Tipster Performance Log Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tipster_performance_log" (
                "id" SERIAL PRIMARY KEY,
                "tipster_id" INT NOT NULL REFERENCES "tipsters"("id") ON DELETE CASCADE,
                "snapshot_date" DATE NOT NULL,
                "total_predictions" INT NOT NULL,
                "total_wins" INT NOT NULL,
                "win_rate" DECIMAL(5,2) NOT NULL,
                "roi" DECIMAL(8,2) NOT NULL,
                "profit" DECIMAL(10,2) NOT NULL,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("tipster_id", "snapshot_date")
            )
        `);

        // 7. Create Smart Coupons Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "smart_coupons" (
                "id" SERIAL PRIMARY KEY,
                "date" DATE NOT NULL,
                "total_odds" DECIMAL(8,3) NOT NULL,
                "status" VARCHAR(20) DEFAULT 'pending',
                "profit" DECIMAL(10,2) DEFAULT 0,
                "fixtures" JSONB DEFAULT '[]',
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 8. Create News Articles Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "news_articles" (
                "id" SERIAL PRIMARY KEY,
                "slug" VARCHAR(100) UNIQUE NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "excerpt" TEXT,
                "content" TEXT DEFAULT '',
                "category" VARCHAR(50) DEFAULT 'news',
                "image_url" VARCHAR(500),
                "source_url" VARCHAR(500),
                "featured" BOOLEAN DEFAULT false,
                "meta_description" VARCHAR(500),
                "published_at" TIMESTAMP,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 9. Create Resource Categories Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "resource_categories" (
                "id" SERIAL PRIMARY KEY,
                "slug" VARCHAR(50) UNIQUE NOT NULL,
                "name" VARCHAR(100) NOT NULL,
                "description" TEXT,
                "level" VARCHAR(20) DEFAULT 'beginner',
                "sort_order" INT DEFAULT 0,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 10. Create Resource Items Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "resource_items" (
                "id" SERIAL PRIMARY KEY,
                "category_id" INT NOT NULL REFERENCES "resource_categories"("id") ON DELETE CASCADE,
                "slug" VARCHAR(100) NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "excerpt" TEXT,
                "content" TEXT DEFAULT '',
                "type" VARCHAR(20) DEFAULT 'article',
                "duration_minutes" INT,
                "tool_config" JSONB,
                "featured" BOOLEAN DEFAULT false,
                "sort_order" INT DEFAULT 0,
                "published_at" TIMESTAMP,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("category_id", "slug")
            )
        `);

        // Add indices for performance
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tipsters_username" ON "tipsters"("username")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_predictions_tipster" ON "predictions"("tipster_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_predictions_date" ON "predictions"("prediction_date")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pred_fixtures_pred" ON "prediction_fixtures"("prediction_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_news_articles_slug" ON "news_articles"("slug")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_smart_coupons_date" ON "smart_coupons"("date")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop in reverse order of dependencies
        await queryRunner.query(`DROP TABLE IF EXISTS "resource_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "resource_categories"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "news_articles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "smart_coupons"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tipster_performance_log"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tipster_follows"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "prediction_fixtures"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "predictions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tipsters"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at"`);
    }
}
