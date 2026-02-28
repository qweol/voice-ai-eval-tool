-- ASR 样本音频表 - MySQL 版本
-- 执行前请确认数据库名称

USE voice_ai_eval;

-- 创建 asr_samples 表
CREATE TABLE IF NOT EXISTS `asr_samples` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL COMMENT '样本名称',
  `description` TEXT COMMENT '样本描述',
  `filename` VARCHAR(255) UNIQUE NOT NULL COMMENT '存储文件名（UUID）',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `file_size` INT NOT NULL COMMENT '文件大小（字节）',
  `duration` DECIMAL(10, 2) COMMENT '音频时长（秒）',
  `format` VARCHAR(20) NOT NULL COMMENT '音频格式',
  `sample_rate` INT COMMENT '采样率（Hz）',
  `bit_rate` INT COMMENT '比特率（kbps）',
  `channels` INT DEFAULT 1 COMMENT '声道数',
  `tags` JSON DEFAULT ('[]') COMMENT '标签数组',
  `language` VARCHAR(20) DEFAULT 'zh' COMMENT '语言',
  `reference_text` TEXT COMMENT '参考文本',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `last_used_at` DATETIME COMMENT '最后使用时间',
  `uploaded_by` VARCHAR(100) DEFAULT 'system' COMMENT '上传者',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_created_at` (`created_at` DESC),
  INDEX `idx_language` (`language`),
  INDEX `idx_usage_count` (`usage_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ASR样本音频表';

-- 验证表是否创建成功
SHOW TABLES LIKE 'asr_samples';

-- 查看表结构
DESC asr_samples;
