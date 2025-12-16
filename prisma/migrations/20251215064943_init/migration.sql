-- CreateEnum
CREATE TYPE "BatchTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "batch_tests" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "tags" TEXT[],
    "status" "BatchTestStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL DEFAULT '{}',
    "providers" TEXT[],
    "total_cases" INTEGER NOT NULL DEFAULT 0,
    "completed_cases" INTEGER NOT NULL DEFAULT 0,
    "failed_cases" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2),
    "avg_duration" DECIMAL(10,2),
    "total_cost" DECIMAL(10,4),
    "created_by" VARCHAR(100) NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batch_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" VARCHAR(50),
    "expected_voice" VARCHAR(100),
    "tags" TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_test_results" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "status" "TestResultStatus" NOT NULL,
    "audio_url" TEXT,
    "duration" DECIMAL(10,2),
    "cost" DECIMAL(10,4),
    "technical_params" JSONB NOT NULL DEFAULT '{}',
    "user_rating" JSONB,
    "error" TEXT,
    "ttfb" INTEGER,
    "total_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_baselines" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "batch_id" TEXT NOT NULL,
    "description" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_by" VARCHAR(100) NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_reports" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "current_batch_id" TEXT NOT NULL,
    "baseline_batch_ids" TEXT[],
    "summary" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "pdf_url" TEXT,
    "excel_url" TEXT,
    "created_by" VARCHAR(100) NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "batch_tests_status_idx" ON "batch_tests"("status");

-- CreateIndex
CREATE INDEX "batch_tests_category_idx" ON "batch_tests"("category");

-- CreateIndex
CREATE INDEX "batch_tests_created_at_idx" ON "batch_tests"("created_at" DESC);

-- CreateIndex
CREATE INDEX "test_cases_batch_id_idx" ON "test_cases"("batch_id");

-- CreateIndex
CREATE INDEX "test_cases_batch_id_order_index_idx" ON "test_cases"("batch_id", "order_index");

-- CreateIndex
CREATE INDEX "batch_test_results_batch_id_idx" ON "batch_test_results"("batch_id");

-- CreateIndex
CREATE INDEX "batch_test_results_test_case_id_idx" ON "batch_test_results"("test_case_id");

-- CreateIndex
CREATE INDEX "batch_test_results_provider_idx" ON "batch_test_results"("provider");

-- CreateIndex
CREATE INDEX "batch_test_results_status_idx" ON "batch_test_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "batch_test_results_batch_id_test_case_id_provider_key" ON "batch_test_results"("batch_id", "test_case_id", "provider");

-- CreateIndex
CREATE INDEX "comparison_baselines_batch_id_idx" ON "comparison_baselines"("batch_id");

-- CreateIndex
CREATE INDEX "comparison_reports_current_batch_id_idx" ON "comparison_reports"("current_batch_id");

-- CreateIndex
CREATE INDEX "comparison_reports_created_at_idx" ON "comparison_reports"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_test_results" ADD CONSTRAINT "batch_test_results_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_test_results" ADD CONSTRAINT "batch_test_results_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_baselines" ADD CONSTRAINT "comparison_baselines_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_reports" ADD CONSTRAINT "comparison_reports_current_batch_id_fkey" FOREIGN KEY ("current_batch_id") REFERENCES "batch_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
