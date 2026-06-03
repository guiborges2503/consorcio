-- Migração 002 — Forma de cobrança por empresa + preços por usuário
-- Mensal: R$ 34,90/usuário | Anual: 12 × R$ 29,99 = R$ 359,88/usuário

ALTER TABLE `consorcio_empresas`
  ADD COLUMN `forma_cobranca` enum('MENSAL','ANUAL') NOT NULL DEFAULT 'MENSAL' AFTER `plano_codigo`;

UPDATE `consorcio_planos`
SET
  `nome` = 'Por usuário',
  `descricao` = 'Cobrança por usuário cadastrado na empresa',
  `valor_mensal` = 34.90,
  `valor_anual` = 359.88
WHERE `codigo` = 'basico';

UPDATE `consorcio_empresas`
SET
  `valor_mensal` = 34.90,
  `valor_anual` = 359.88,
  `plano_codigo` = 'basico'
WHERE `valor_mensal` = 199.00 OR `valor_mensal` = 0;
