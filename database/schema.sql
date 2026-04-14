-- Consórcio — schema completo (WAMP / MySQL)
CREATE DATABASE IF NOT EXISTS `consorcio` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `consorcio`;

CREATE TABLE IF NOT EXISTS `consorcio_usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `login` varchar(64) NOT NULL,
  `senha` char(32) NOT NULL COMMENT 'MD5',
  `nome` varchar(120) NOT NULL DEFAULT '',
  `email` varchar(120) NOT NULL DEFAULT '',
  `status` enum('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO',
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
  `commission` decimal(14,2) NOT NULL,
  `status` enum('pending','approved','paid') NOT NULL DEFAULT 'pending',
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

-- Usuários demo (senha: admin123)
INSERT INTO `consorcio_usuarios` (`id`, `login`, `senha`, `nome`, `email`, `status`, `month_goal`)
VALUES
  (1, 'admin', '0192023a7bbd73250516f069df18b500', 'Carlos Silva', 'carlos@local.dev', 'ATIVO', 500000),
  (2, 'amanda', '0192023a7bbd73250516f069df18b500', 'Amanda Rodrigues', 'amanda@local.dev', 'ATIVO', 500000),
  (3, 'bruno', '0192023a7bbd73250516f069df18b500', 'Bruno Costa', 'bruno@local.dev', 'ATIVO', 500000)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`), `month_goal` = VALUES(`month_goal`);

-- Leads demo (ids fixos — seguro reexecutar com ON DUPLICATE)
INSERT INTO `consorcio_leads` (`id`, `usuario_id`, `name`, `phone`, `email`, `status`, `last_contact`, `next_action`, `interest`, `notes`, `created_at`) VALUES
(1, 1, 'Maria Santos', '(11) 98765-4321', 'maria.santos@email.com', 'hot', '2026-03-30', 'Enviar proposta final', 90, 'Interessada em carta de R$ 80.000 para automóvel', '2026-03-15 10:00:00'),
(2, 1, 'João Oliveira', '(11) 97654-3210', 'joao.oliveira@email.com', 'warm', '2026-03-29', 'Agendar reunião presencial', 65, 'Quer consórcio imobiliário de R$ 200.000', '2026-03-20 10:00:00'),
(3, 1, 'Ana Paula Costa', '(11) 96543-2109', 'ana.costa@email.com', 'cold', '2026-03-25', 'Retomar contato', 30, 'Pediu tempo para pensar', '2026-03-10 10:00:00'),
(4, 1, 'Pedro Mendes', '(11) 95432-1098', 'pedro.mendes@email.com', 'hot', '2026-03-31', 'Fechar negócio', 95, 'Pronto para assinar contrato de R$ 50.000', '2026-03-22 10:00:00'),
(5, 1, 'Juliana Ferreira', '(11) 94321-0987', 'juliana.ferreira@email.com', 'warm', '2026-03-28', 'Enviar simulação', 70, 'Quer comparar com outras opções', '2026-03-18 10:00:00'),
(6, 1, 'Roberto Lima', '(11) 93210-9876', 'roberto.lima@email.com', 'cold', '2026-03-20', 'Retomar em 1 semana', 25, 'Sem orçamento no momento', '2026-03-05 10:00:00')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `phone`=VALUES(`phone`), `email`=VALUES(`email`), `status`=VALUES(`status`), `last_contact`=VALUES(`last_contact`), `next_action`=VALUES(`next_action`), `interest`=VALUES(`interest`), `notes`=VALUES(`notes`);

INSERT INTO `consorcio_lead_interactions` (`id`, `lead_id`, `type`, `date`, `notes`) VALUES
(1, 1, 'call', '2026-03-30', 'Ligação - Negociou condições'),
(2, 1, 'whatsapp', '2026-03-28', 'WhatsApp - Enviou documentos'),
(3, 2, 'whatsapp', '2026-03-29', 'WhatsApp - Tirou dúvidas'),
(4, 3, 'call', '2026-03-25', 'Ligação - Não demonstrou interesse'),
(5, 4, 'meeting', '2026-03-31', 'Reunião - Acertou todos os detalhes'),
(6, 4, 'call', '2026-03-30', 'Ligação - Confirmou interesse'),
(7, 5, 'email', '2026-03-28', 'Email - Solicitou simulação'),
(8, 6, 'whatsapp', '2026-03-20', 'WhatsApp - Sem condições agora')
ON DUPLICATE KEY UPDATE `notes`=VALUES(`notes`);

INSERT INTO `consorcio_sales` (`id`, `usuario_id`, `lead_id`, `client_name`, `cpf`, `phone`, `email`, `product_type`, `card_value`, `commission`, `status`, `sale_date`, `notes`, `installments`, `admin_fee`, `commission_percent`) VALUES
(1, 1, NULL, 'Carlos Eduardo', '000', '(11)90000-0001', 'c@e.com', 'Automóvel', 80000, 3200, 'paid', '2026-03-15', '', 80, 20, 4),
(2, 1, NULL, 'Fernanda Silva', '000', '(11)90000-0002', 'f@s.com', 'Imóvel', 150000, 6000, 'approved', '2026-03-20', '', 80, 20, 4),
(3, 1, NULL, 'Ricardo Alves', '000', '(11)90000-0003', 'r@a.com', 'Automóvel', 50000, 2000, 'paid', '2026-03-10', '', 80, 20, 4),
(4, 1, NULL, 'Patricia Gomes', '000', '(11)90000-0004', 'p@g.com', 'Imóvel', 200000, 8000, 'pending', '2026-03-28', '', 80, 20, 4),
(5, 1, NULL, 'Marcos Santos', '000', '(11)90000-0005', 'm@s.com', 'Automóvel', 60000, 2400, 'approved', '2026-03-25', '', 80, 20, 4),
(6, 2, NULL, 'Cliente Amanda A', '000', '(11)91111-1111', 'a@a.com', 'Imóvel', 120000, 4800, 'paid', '2026-03-12', '', 80, 20, 4),
(7, 2, NULL, 'Cliente Amanda B', '000', '(11)92222-2222', 'b@b.com', 'Automóvel', 90000, 3600, 'paid', '2026-03-18', '', 80, 20, 4),
(8, 3, NULL, 'Cliente Bruno A', '000', '(11)93333-3333', 'c@c.com', 'Automóvel', 70000, 2800, 'paid', '2026-03-14', '', 80, 20, 4)
ON DUPLICATE KEY UPDATE `card_value`=VALUES(`card_value`), `commission`=VALUES(`commission`), `status`=VALUES(`status`);

ALTER TABLE `consorcio_leads` AUTO_INCREMENT = 100;
ALTER TABLE `consorcio_lead_interactions` AUTO_INCREMENT = 100;
ALTER TABLE `consorcio_sales` AUTO_INCREMENT = 100;
