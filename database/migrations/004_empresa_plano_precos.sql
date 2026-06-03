-- Migração 004 — Preços vindos do plano (snapshot só na fatura gerada)
-- Empresas seguem consorcio_planos; valor_mensal/valor_anual só se preco_personalizado = 1

ALTER TABLE `consorcio_empresas`
  MODIFY COLUMN `valor_mensal` decimal(14,2) NULL DEFAULT NULL
    COMMENT 'Só usado se preco_personalizado = 1',
  MODIFY COLUMN `valor_anual` decimal(14,2) NULL DEFAULT NULL
    COMMENT 'Só usado se preco_personalizado = 1';

ALTER TABLE `consorcio_empresas`
  ADD COLUMN `preco_personalizado` tinyint(1) NOT NULL DEFAULT 0
    COMMENT '1 = usa valor_mensal/valor_anual da empresa; 0 = segue o plano'
    AFTER `plano_codigo`;

UPDATE `consorcio_empresas`
SET `valor_mensal` = NULL, `valor_anual` = NULL, `preco_personalizado` = 0
WHERE `preco_personalizado` = 0;

UPDATE `consorcio_planos`
SET
  `nome` = 'Por usuário',
  `descricao` = 'Cobrança por usuário cadastrado na empresa',
  `valor_mensal` = 34.90,
  `valor_anual` = 359.88,
  `ativo` = 1
WHERE `codigo` = 'basico';
