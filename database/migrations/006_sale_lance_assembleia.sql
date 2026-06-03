-- Migração 006 — Lance ofertado (sim/não) e data da assembleia no contrato

ALTER TABLE `consorcio_sales`
  ADD COLUMN `lance_ofertado` tinyint(1) NOT NULL DEFAULT 0
    COMMENT '1 = lance ofertado na assembleia; 0 = não'
    AFTER `installment_value`,
  ADD COLUMN `data_assembleia` date DEFAULT NULL
    COMMENT 'Data da assembleia em que o lance foi ofertado (só se lance_ofertado=1)'
    AFTER `lance_ofertado`;
