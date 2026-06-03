-- Migração 007 — Dia fixo mensal da assembleia (data completa só quando houve lance)

ALTER TABLE `consorcio_sales`
  ADD COLUMN `dia_assembleia` tinyint unsigned DEFAULT NULL
    COMMENT 'Dia fixo mensal da assembleia do grupo (1-28)'
    AFTER `lance_ofertado`;

ALTER TABLE `consorcio_sales`
  MODIFY COLUMN `data_assembleia` date DEFAULT NULL
    COMMENT 'Data da assembleia em que o lance foi ofertado (só se lance_ofertado=1)';
