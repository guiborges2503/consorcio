-- Migração 001 — Multi-tenancy (empresas) + faturas SaaS + logs do sistema
-- Execute em banco EXISTENTE após schema.sql inicial.
-- Compatível MySQL 5.7+ / MariaDB 10.3+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Empresas (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consorcio_empresas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(160) NOT NULL,
  `slug` varchar(80) NOT NULL COMMENT 'Identificador único (subdomínio ou código interno)',
  `documento` varchar(20) NOT NULL DEFAULT '' COMMENT 'CNPJ/CPF',
  `email` varchar(120) NOT NULL DEFAULT '',
  `telefone` varchar(32) NOT NULL DEFAULT '',
  `status` enum('ATIVA','INATIVA','SUSPENSA') NOT NULL DEFAULT 'ATIVA',
  `plano_codigo` varchar(40) NOT NULL DEFAULT 'basico' COMMENT 'Referência ao plano contratado',
  `valor_mensal` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Valor cobrado mensalmente pelo uso do sistema',
  `valor_anual` decimal(14,2) DEFAULT NULL COMMENT 'Valor cobrado anualmente (opcional)',
  `dia_vencimento` tinyint unsigned NOT NULL DEFAULT 10 COMMENT 'Dia do mês para vencimento das faturas',
  `observacoes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresa_slug` (`slug`),
  KEY `idx_empresa_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Planos de assinatura (referência para cobrança futura)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consorcio_planos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(40) NOT NULL,
  `nome` varchar(120) NOT NULL,
  `descricao` varchar(500) NOT NULL DEFAULT '',
  `valor_mensal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `valor_anual` decimal(14,2) DEFAULT NULL,
  `max_usuarios` smallint unsigned DEFAULT NULL COMMENT 'NULL = ilimitado',
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plano_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `consorcio_planos` (`codigo`, `nome`, `descricao`, `valor_mensal`, `valor_anual`, `max_usuarios`)
VALUES
  ('basico', 'Básico', 'Até 5 vendedores', 199.00, 1990.00, 5),
  ('profissional', 'Profissional', 'Até 20 vendedores', 499.00, 4990.00, 20),
  ('enterprise', 'Enterprise', 'Usuários ilimitados', 999.00, 9990.00, NULL)
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`),
  `valor_mensal` = VALUES(`valor_mensal`),
  `valor_anual` = VALUES(`valor_anual`);

-- ---------------------------------------------------------------------------
-- Faturas do sistema (SaaS) — separadas de consorcio_parcelas (parcelas de consórcio)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consorcio_faturas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` int unsigned NOT NULL,
  `numero` varchar(32) NOT NULL COMMENT 'Ex: FAT-2026-0001',
  `tipo_movimento` enum('RECEBER','PAGAR') NOT NULL DEFAULT 'RECEBER'
    COMMENT 'RECEBER = empresa deve à plataforma; PAGAR = plataforma deve (ajustes/reembolsos)',
  `tipo_periodo` enum('MENSAL','ANUAL','AVULSA') NOT NULL DEFAULT 'MENSAL',
  `referencia` varchar(20) NOT NULL COMMENT 'Ex: 2026-06 (mensal) ou 2026 (anual)',
  `descricao` varchar(255) NOT NULL DEFAULT '',
  `valor` decimal(14,2) NOT NULL,
  `valor_pago` decimal(14,2) NOT NULL DEFAULT 0.00,
  `status` enum('ABERTA','PAGA','PARCIAL','VENCIDA','CANCELADA') NOT NULL DEFAULT 'ABERTA',
  `vencimento` date NOT NULL,
  `pago_em` date DEFAULT NULL,
  `pago_por_usuario_id` int unsigned DEFAULT NULL COMMENT 'Admin master que deu baixa manual',
  `observacoes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fatura_numero` (`numero`),
  KEY `idx_faturas_empresa` (`empresa_id`),
  KEY `idx_faturas_status` (`status`),
  KEY `idx_faturas_vencimento` (`vencimento`),
  KEY `idx_faturas_tipo_movimento` (`tipo_movimento`),
  KEY `idx_faturas_referencia` (`referencia`),
  CONSTRAINT `fk_faturas_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `consorcio_empresas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de baixas / pagamentos parciais
CREATE TABLE IF NOT EXISTS `consorcio_fatura_pagamentos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `fatura_id` int unsigned NOT NULL,
  `valor` decimal(14,2) NOT NULL,
  `data_pagamento` date NOT NULL,
  `forma` enum('MANUAL','PIX','BOLETO','CARTAO','TRANSFERENCIA','OUTRO') NOT NULL DEFAULT 'MANUAL',
  `referencia_externa` varchar(120) NOT NULL DEFAULT '' COMMENT 'ID gateway/boleto futuro',
  `observacoes` text,
  `registrado_por_usuario_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fat_pag_fatura` (`fatura_id`),
  CONSTRAINT `fk_fat_pag_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `consorcio_faturas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Logs de auditoria (API / sistema)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `consorcio_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` int unsigned DEFAULT NULL COMMENT 'NULL = ação global (master)',
  `usuario_id` int unsigned DEFAULT NULL,
  `nivel` enum('INFO','WARN','ERROR','SECURITY') NOT NULL DEFAULT 'INFO',
  `acao` varchar(80) NOT NULL COMMENT 'Ex: LOGIN, FATURA_BAIXA, USUARIO_CRIADO',
  `recurso` varchar(80) NOT NULL DEFAULT '' COMMENT 'Ex: faturas, users, login',
  `recurso_id` varchar(64) NOT NULL DEFAULT '',
  `mensagem` varchar(500) NOT NULL DEFAULT '',
  `ip` varchar(45) NOT NULL DEFAULT '',
  `user_agent` varchar(255) NOT NULL DEFAULT '',
  `payload` json DEFAULT NULL COMMENT 'Detalhes extras (sanitizados)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_empresa` (`empresa_id`),
  KEY `idx_audit_usuario` (`usuario_id`),
  KEY `idx_audit_acao` (`acao`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Alterações nas tabelas existentes
-- ---------------------------------------------------------------------------

-- Novo papel MASTER (admin da plataforma) além de ADMIN (admin da empresa) e VENDEDOR
ALTER TABLE `consorcio_usuarios`
  MODIFY COLUMN `role` enum('MASTER','ADMIN','VENDEDOR') NOT NULL DEFAULT 'VENDEDOR';

-- Vínculo do usuário à empresa (NULL apenas para MASTER)
-- Ignore erro "Duplicate column" se já executou esta migração.
ALTER TABLE `consorcio_usuarios`
  ADD COLUMN `empresa_id` int unsigned DEFAULT NULL AFTER `role`,
  ADD KEY `idx_usuarios_empresa` (`empresa_id`);

ALTER TABLE `consorcio_leads`
  ADD COLUMN `empresa_id` int unsigned DEFAULT NULL AFTER `usuario_id`,
  ADD KEY `idx_leads_empresa` (`empresa_id`);

ALTER TABLE `consorcio_sales`
  ADD COLUMN `empresa_id` int unsigned DEFAULT NULL AFTER `usuario_id`,
  ADD KEY `idx_sales_empresa` (`empresa_id`);

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Dados iniciais e migração de registros existentes
-- ---------------------------------------------------------------------------

INSERT INTO `consorcio_empresas` (`id`, `nome`, `slug`, `email`, `status`, `plano_codigo`, `valor_mensal`, `valor_anual`, `dia_vencimento`)
VALUES (1, 'Empresa Padrão', 'empresa-padrao', 'contato@empresa-padrao.local', 'ATIVA', 'basico', 199.00, 1990.00, 10)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- Vincula usuários existentes à empresa padrão (exceto futuros MASTER)
UPDATE `consorcio_usuarios`
SET `empresa_id` = 1
WHERE `empresa_id` IS NULL AND `role` <> 'MASTER';

-- Backfill empresa_id em leads e vendas a partir do vendedor
UPDATE `consorcio_leads` l
INNER JOIN `consorcio_usuarios` u ON u.id = l.usuario_id
SET l.empresa_id = u.empresa_id
WHERE l.empresa_id IS NULL AND u.empresa_id IS NOT NULL;

UPDATE `consorcio_sales` s
INNER JOIN `consorcio_usuarios` u ON u.id = s.usuario_id
SET s.empresa_id = u.empresa_id
WHERE s.empresa_id IS NULL AND u.empresa_id IS NOT NULL;

-- Usuário master da plataforma (senha: admin123 — altere em produção)
INSERT INTO `consorcio_usuarios` (`login`, `senha`, `nome`, `email`, `status`, `role`, `empresa_id`, `month_goal`)
VALUES ('master', '0192023a7bbd73250516f069df18b500', 'Admin Master', 'master@contempla.local', 'ATIVO', 'MASTER', NULL, 0)
ON DUPLICATE KEY UPDATE `role` = 'MASTER', `empresa_id` = NULL;

-- Exemplo de faturas de demonstração
INSERT INTO `consorcio_faturas`
  (`empresa_id`, `numero`, `tipo_movimento`, `tipo_periodo`, `referencia`, `descricao`, `valor`, `status`, `vencimento`)
VALUES
  (1, 'FAT-2026-0001', 'RECEBER', 'MENSAL', '2026-05', 'Assinatura mensal — Maio/2026', 199.00, 'PAGA', '2026-05-10'),
  (1, 'FAT-2026-0002', 'RECEBER', 'MENSAL', '2026-06', 'Assinatura mensal — Junho/2026', 199.00, 'ABERTA', '2026-06-10')
ON DUPLICATE KEY UPDATE `descricao` = VALUES(`descricao`);

-- Views para relatório financeiro consolidado (master admin)
CREATE OR REPLACE VIEW `vw_faturas_resumo` AS
SELECT
  f.empresa_id,
  e.nome AS empresa_nome,
  f.tipo_movimento,
  f.status,
  COUNT(*) AS quantidade,
  SUM(f.valor) AS valor_total,
  SUM(f.valor_pago) AS valor_pago_total,
  SUM(GREATEST(f.valor - f.valor_pago, 0)) AS saldo_aberto
FROM consorcio_faturas f
INNER JOIN consorcio_empresas e ON e.id = f.empresa_id
WHERE f.status <> 'CANCELADA'
GROUP BY f.empresa_id, e.nome, f.tipo_movimento, f.status;

CREATE OR REPLACE VIEW `vw_faturas_financeiro_geral` AS
SELECT
  f.tipo_movimento,
  SUM(CASE WHEN f.status IN ('ABERTA','VENCIDA','PARCIAL') THEN GREATEST(f.valor - f.valor_pago, 0) ELSE 0 END) AS total_em_aberto,
  SUM(CASE WHEN f.status = 'PAGA' THEN f.valor_pago ELSE 0 END) AS total_pago,
  SUM(CASE WHEN f.tipo_movimento = 'RECEBER' AND f.status IN ('ABERTA','VENCIDA','PARCIAL') THEN GREATEST(f.valor - f.valor_pago, 0) ELSE 0 END) AS a_receber,
  SUM(CASE WHEN f.tipo_movimento = 'PAGAR' AND f.status IN ('ABERTA','VENCIDA','PARCIAL') THEN GREATEST(f.valor - f.valor_pago, 0) ELSE 0 END) AS a_pagar
FROM consorcio_faturas f
WHERE f.status <> 'CANCELADA';
