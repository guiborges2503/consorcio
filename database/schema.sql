-- Consórcio — schema completo (MySQL / Hostinger)
-- Banco: u276379167_CONSORCIO
-- Migração incremental: database/migrations/001_multitenancy_faturas.sql

CREATE TABLE IF NOT EXISTS `consorcio_empresas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(160) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `documento` varchar(20) NOT NULL DEFAULT '',
  `email` varchar(120) NOT NULL DEFAULT '',
  `telefone` varchar(32) NOT NULL DEFAULT '',
  `status` enum('ATIVA','INATIVA','SUSPENSA') NOT NULL DEFAULT 'ATIVA',
  `plano_codigo` varchar(40) NOT NULL DEFAULT 'basico',
  `valor_mensal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `valor_anual` decimal(14,2) DEFAULT NULL,
  `dia_vencimento` tinyint unsigned NOT NULL DEFAULT 10,
  `observacoes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresa_slug` (`slug`),
  KEY `idx_empresa_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_planos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(40) NOT NULL,
  `nome` varchar(120) NOT NULL,
  `descricao` varchar(500) NOT NULL DEFAULT '',
  `valor_mensal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `valor_anual` decimal(14,2) DEFAULT NULL,
  `max_usuarios` smallint unsigned DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plano_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `login` varchar(64) NOT NULL,
  `senha` char(32) NOT NULL COMMENT 'MD5',
  `nome` varchar(120) NOT NULL DEFAULT '',
  `email` varchar(120) NOT NULL DEFAULT '',
  `status` enum('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
  `role` enum('MASTER','ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR',
  `empresa_id` int unsigned DEFAULT NULL COMMENT 'NULL apenas para MASTER',
  `month_goal` decimal(14,2) NOT NULL DEFAULT 500000.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_login` (`login`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_usuarios_empresa` (`empresa_id`),
  CONSTRAINT `fk_usuarios_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `consorcio_empresas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_leads` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `empresa_id` int unsigned DEFAULT NULL,
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
  KEY `idx_leads_empresa` (`empresa_id`),
  KEY `idx_leads_status` (`status`),
  CONSTRAINT `fk_leads_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `consorcio_usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leads_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `consorcio_empresas` (`id`) ON DELETE RESTRICT
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
  `empresa_id` int unsigned DEFAULT NULL,
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
  `lance_ofertado` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = lance ofertado; 0 = não',
  `dia_assembleia` tinyint unsigned DEFAULT NULL COMMENT 'Dia fixo mensal da assembleia (1-28)',
  `data_assembleia` date DEFAULT NULL COMMENT 'Data da assembleia em que houve lance',
  PRIMARY KEY (`id`),
  KEY `idx_sales_user` (`usuario_id`),
  KEY `idx_sales_empresa` (`empresa_id`),
  KEY `idx_sales_status` (`status`),
  KEY `idx_sales_date` (`sale_date`),
  CONSTRAINT `fk_sales_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `consorcio_usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `consorcio_empresas` (`id`) ON DELETE RESTRICT,
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

CREATE TABLE IF NOT EXISTS `consorcio_faturas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` int unsigned NOT NULL,
  `numero` varchar(32) NOT NULL,
  `tipo_movimento` enum('RECEBER','PAGAR') NOT NULL DEFAULT 'RECEBER',
  `tipo_periodo` enum('MENSAL','ANUAL','AVULSA') NOT NULL DEFAULT 'MENSAL',
  `referencia` varchar(20) NOT NULL,
  `descricao` varchar(255) NOT NULL DEFAULT '',
  `valor` decimal(14,2) NOT NULL,
  `valor_pago` decimal(14,2) NOT NULL DEFAULT 0.00,
  `status` enum('ABERTA','PAGA','PARCIAL','VENCIDA','CANCELADA') NOT NULL DEFAULT 'ABERTA',
  `vencimento` date NOT NULL,
  `pago_em` date DEFAULT NULL,
  `pago_por_usuario_id` int unsigned DEFAULT NULL,
  `observacoes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fatura_numero` (`numero`),
  KEY `idx_faturas_empresa` (`empresa_id`),
  KEY `idx_faturas_status` (`status`),
  KEY `idx_faturas_vencimento` (`vencimento`),
  KEY `idx_faturas_tipo_movimento` (`tipo_movimento`),
  CONSTRAINT `fk_faturas_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `consorcio_empresas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_fatura_pagamentos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `fatura_id` int unsigned NOT NULL,
  `valor` decimal(14,2) NOT NULL,
  `data_pagamento` date NOT NULL,
  `forma` enum('MANUAL','PIX','BOLETO','CARTAO','TRANSFERENCIA','OUTRO') NOT NULL DEFAULT 'MANUAL',
  `referencia_externa` varchar(120) NOT NULL DEFAULT '',
  `observacoes` text,
  `registrado_por_usuario_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fat_pag_fatura` (`fatura_id`),
  CONSTRAINT `fk_fat_pag_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `consorcio_faturas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consorcio_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` int unsigned DEFAULT NULL,
  `usuario_id` int unsigned DEFAULT NULL,
  `nivel` enum('INFO','WARN','ERROR','SECURITY') NOT NULL DEFAULT 'INFO',
  `acao` varchar(80) NOT NULL,
  `recurso` varchar(80) NOT NULL DEFAULT '',
  `recurso_id` varchar(64) NOT NULL DEFAULT '',
  `mensagem` varchar(500) NOT NULL DEFAULT '',
  `ip` varchar(45) NOT NULL DEFAULT '',
  `user_agent` varchar(255) NOT NULL DEFAULT '',
  `payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_empresa` (`empresa_id`),
  KEY `idx_audit_usuario` (`usuario_id`),
  KEY `idx_audit_acao` (`acao`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados de teste: importe database/seed-demo.sql apenas em desenvolvimento.
