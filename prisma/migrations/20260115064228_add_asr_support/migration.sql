-- CreateTable
CREATE TABLE `batch_tests` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL,
    `tags` JSON NOT NULL,
    `status` ENUM('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
    `test_type` ENUM('TTS', 'ASR') NOT NULL DEFAULT 'TTS',
    `config` JSON NOT NULL,
    `providers` JSON NOT NULL,
    `audio_source` VARCHAR(255) NULL,
    `language` VARCHAR(20) NULL,
    `total_cases` INTEGER NOT NULL DEFAULT 0,
    `completed_cases` INTEGER NOT NULL DEFAULT 0,
    `failed_cases` INTEGER NOT NULL DEFAULT 0,
    `success_rate` DECIMAL(5, 2) NULL,
    `avg_duration` DECIMAL(10, 2) NULL,
    `total_cost` DECIMAL(10, 4) NULL,
    `created_by` VARCHAR(100) NOT NULL DEFAULT 'system',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,

    INDEX `batch_tests_status_idx`(`status`),
    INDEX `batch_tests_category_idx`(`category`),
    INDEX `batch_tests_test_type_idx`(`test_type`),
    INDEX `batch_tests_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_cases` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `category` VARCHAR(50) NULL,
    `expected_voice` VARCHAR(100) NULL,
    `tags` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `test_cases_batch_id_idx`(`batch_id`),
    INDEX `test_cases_batch_id_order_index_idx`(`batch_id`, `order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `batch_test_results` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `test_case_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'TIMEOUT') NOT NULL,
    `audio_url` TEXT NULL,
    `duration` DECIMAL(10, 2) NULL,
    `cost` DECIMAL(10, 4) NULL,
    `technical_params` JSON NOT NULL,
    `user_rating` JSON NULL,
    `error` TEXT NULL,
    `ttfb` INTEGER NULL,
    `total_time` INTEGER NULL,
    `recognized_text` TEXT NULL,
    `reference_text` TEXT NULL,
    `similarity` DECIMAL(5, 2) NULL,
    `avg_similarity` DECIMAL(5, 2) NULL,
    `confidence` DECIMAL(5, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `batch_test_results_batch_id_idx`(`batch_id`),
    INDEX `batch_test_results_test_case_id_idx`(`test_case_id`),
    INDEX `batch_test_results_provider_idx`(`provider`),
    INDEX `batch_test_results_status_idx`(`status`),
    UNIQUE INDEX `batch_test_results_batch_id_test_case_id_provider_key`(`batch_id`, `test_case_id`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comparison_baselines` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `snapshot` JSON NOT NULL,
    `created_by` VARCHAR(100) NOT NULL DEFAULT 'system',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comparison_baselines_batch_id_idx`(`batch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comparison_reports` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `current_batch_id` VARCHAR(191) NOT NULL,
    `baseline_batch_ids` JSON NOT NULL,
    `summary` JSON NOT NULL,
    `details` JSON NOT NULL,
    `pdf_url` TEXT NULL,
    `excel_url` TEXT NULL,
    `created_by` VARCHAR(100) NOT NULL DEFAULT 'system',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comparison_reports_current_batch_id_idx`(`current_batch_id`),
    INDEX `comparison_reports_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asr_samples` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `duration` DECIMAL(10, 2) NULL,
    `format` VARCHAR(20) NOT NULL,
    `sample_rate` INTEGER NULL,
    `bit_rate` INTEGER NULL,
    `channels` INTEGER NULL DEFAULT 1,
    `tags` JSON NOT NULL,
    `language` VARCHAR(20) NOT NULL DEFAULT 'zh',
    `reference_text` TEXT NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `last_used_at` DATETIME(3) NULL,
    `uploaded_by` VARCHAR(100) NOT NULL DEFAULT 'system',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asr_samples_filename_key`(`filename`),
    INDEX `asr_samples_created_at_idx`(`created_at` DESC),
    INDEX `asr_samples_language_idx`(`language`),
    INDEX `asr_samples_usage_count_idx`(`usage_count` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batch_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `batch_test_results` ADD CONSTRAINT `batch_test_results_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batch_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `batch_test_results` ADD CONSTRAINT `batch_test_results_test_case_id_fkey` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comparison_baselines` ADD CONSTRAINT `comparison_baselines_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batch_tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comparison_reports` ADD CONSTRAINT `comparison_reports_current_batch_id_fkey` FOREIGN KEY (`current_batch_id`) REFERENCES `batch_tests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
