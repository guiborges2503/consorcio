-- Migração 003 — Itens por usuário na fatura (baixa individual abate do total)

CREATE TABLE IF NOT EXISTS `consorcio_fatura_itens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `fatura_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `usuario_nome` varchar(120) NOT NULL DEFAULT '',
  `valor` decimal(14,2) NOT NULL,
  `valor_pago` decimal(14,2) NOT NULL DEFAULT 0.00,
  `status` enum('ABERTA','PAGA') NOT NULL DEFAULT 'ABERTA',
  `pago_em` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fatura_item_user` (`fatura_id`, `usuario_id`),
  KEY `idx_fat_item_fatura` (`fatura_id`),
  CONSTRAINT `fk_fat_item_fatura` FOREIGN KEY (`fatura_id`) REFERENCES `consorcio_faturas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `consorcio_fatura_pagamentos`
  ADD COLUMN `fatura_item_id` int unsigned DEFAULT NULL AFTER `fatura_id`,
  ADD COLUMN `usuario_id` int unsigned DEFAULT NULL AFTER `fatura_item_id`;
