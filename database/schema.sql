-- Consórcio — schema completo (MySQL / Hostinger)
-- Banco: u276379167_CONSORCIO

CREATE TABLE IF NOT EXISTS `consorcio_usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `login` varchar(64) NOT NULL,
  `senha` char(32) NOT NULL COMMENT 'MD5',
  `nome` varchar(120) NOT NULL DEFAULT '',
  `email` varchar(120) NOT NULL DEFAULT '',
  `status` enum('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `role` enum('ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR',
  `month_goal` decimal(14,2) NOT NULL DEFAULT 500000.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_login` (`login`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_leads` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `phone` varchar(32) NOT NULL DEFAULT '',
  `email` varchar(160) NOT NULL DEFAULT '',
  `status` enum('cold','warm','hot') NOT NULL DEFAULT 'warm',
  `last_contact` date NOT NULL,
  `next_action` varchar(500) NOT NULL DEFAULT '',
  `interest` tinyint unsigned NOT NULL DEFAULT 50,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leads_user` (`usuario_id`),
  KEY `idx_leads_status` (`status`),
  CONSTRAINT `fk_leads_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `consorcio_usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_lead_interactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int unsigned NOT NULL,
  `type` enum('call','whatsapp','email','meeting') NOT NULL,
  `date` date NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_int_lead` (`lead_id`),
  CONSTRAINT `fk_int_lead` FOREIGN KEY (`lead_id`) REFERENCES `consorcio_leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_sales` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `lead_id` int unsigned DEFAULT NULL,
  `client_name` varchar(160) NOT NULL,
  `cpf` varchar(32) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `email` varchar(160) NOT NULL DEFAULT '',
  `product_type` varchar(64) NOT NULL DEFAULT 'Automóvel',
  `card_value` decimal(14,2) NOT NULL,
  `down_payment` decimal(14,2) NOT NULL DEFAULT 0.00,
  `commission` decimal(14,2) NOT NULL,
  `status` enum('pending','approved','paid') NOT NULL DEFAULT 'pending',
  `client_status` enum('ativo','inadimplente','quitado') NOT NULL DEFAULT 'ativo',
  `sale_date` date NOT NULL,
  `notes` text,
  `installments` smallint unsigned NOT NULL DEFAULT 80,
  `admin_fee` decimal(6,2) NOT NULL DEFAULT 20.00,
  `commission_percent` decimal(6,2) NOT NULL DEFAULT 4.00,
  `installment_value` decimal(14,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sales_user` (`usuario_id`),
  KEY `idx_sales_status` (`status`),
  KEY `idx_sales_date` (`sale_date`),
  CONSTRAINT `fk_sales_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `consorcio_usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_lead` FOREIGN KEY (`lead_id`) REFERENCES `consorcio_leads` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_parcelas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` int unsigned NOT NULL,
  `numero` smallint unsigned NOT NULL,
  `due_date` date NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `paid_at` date DEFAULT NULL,
  `status` enum('pendente','paga','atrasada') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_parcela_sale_num` (`sale_id`,`numero`),
  KEY `idx_parcelas_sale` (`sale_id`),
  KEY `idx_parcelas_status` (`status`),
  KEY `idx_parcelas_due` (`due_date`),
  CONSTRAINT `fk_parcelas_sale` FOREIGN KEY (`sale_id`) REFERENCES `consorcio_sales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados de teste: importe database/seed-demo.sql apenas em desenvolvimento.
