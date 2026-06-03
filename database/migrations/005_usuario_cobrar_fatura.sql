-- Migração 005 — Usuário entra ou não na cobrança da fatura
-- cobrar_fatura = 0 → não gera linha na fatura (ex.: admin isento)

ALTER TABLE `consorcio_usuarios`
  ADD COLUMN `cobrar_fatura` tinyint(1) NOT NULL DEFAULT 1
    COMMENT '1 = entra na fatura por usuário; 0 = isento de cobrança'
    AFTER `role`;

UPDATE `consorcio_usuarios`
SET `cobrar_fatura` = 1
WHERE `cobrar_fatura` = 1;
