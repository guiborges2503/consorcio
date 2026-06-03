-- Seed para call de demonstração — vendas do usuário id 4
-- NÃO usar em produção. Rode após schema + migrações 006 e 007.
-- Senha típica dev: admin123 (MD5 0192023a7bbd73250516f069df18b500)
--
-- Uso: mysql -u ... consorcio < database/seed-call-usuario-4.sql

SET NAMES utf8mb4;
SET @uid := 4;
SET @eid := (SELECT empresa_id FROM consorcio_usuarios WHERE id = @uid LIMIT 1);

-- Ajuste aqui se o vendedor 4 estiver em outra empresa
SET @eid := IFNULL(@eid, 1);

-- Limpa dados anteriores deste seed (ids reservados 401–408, leads 401–404)
DELETE FROM consorcio_parcelas WHERE sale_id BETWEEN 401 AND 408;
DELETE FROM consorcio_sales WHERE id BETWEEN 401 AND 408;
DELETE FROM consorcio_lead_interactions WHERE lead_id BETWEEN 401 AND 404;
DELETE FROM consorcio_leads WHERE id BETWEEN 401 AND 404;

-- ---------------------------------------------------------------------------
-- Leads do vendedor 4
-- ---------------------------------------------------------------------------
INSERT INTO `consorcio_leads`
  (`id`, `usuario_id`, `empresa_id`, `name`, `phone`, `email`, `status`, `last_contact`, `next_action`, `interest`, `notes`, `created_at`)
VALUES
  (401, @uid, @eid, 'Luciana Martins', '(11) 98111-2200', 'luciana.m@email.com', 'hot', '2026-06-01', 'Enviar proposta SUV', 88, 'Quer carta R$ 120 mil — comparando administradoras', '2026-05-10 09:00:00'),
  (402, @uid, @eid, 'Diego Ferreira', '(11) 97222-3300', 'diego.f@email.com', 'warm', '2026-05-28', 'Simular imóvel 400k', 72, 'Interesse em consórcio imobiliário', '2026-05-05 11:00:00'),
  (403, @uid, @eid, 'Camila Rocha', '(11) 96333-4400', 'camila.r@email.com', 'cold', '2026-05-15', 'Retomar em 15 dias', 35, 'Pediu pausa por viagem', '2026-04-20 14:00:00'),
  (404, @uid, @eid, 'Henrique Almeida', '(21) 95444-5500', 'henrique.a@email.com', 'hot', '2026-06-02', 'Fechar moto', 92, 'Pronto para assinar — moto R$ 28 mil', '2026-05-25 16:00:00');

INSERT INTO `consorcio_lead_interactions` (`id`, `lead_id`, `type`, `date`, `notes`) VALUES
  (401, 401, 'whatsapp', '2026-06-01', 'Enviou simulação SUV'),
  (402, 401, 'call', '2026-05-30', 'Tirou dúvidas sobre lance'),
  (403, 402, 'email', '2026-05-28', 'Simulação imóvel enviada'),
  (404, 404, 'meeting', '2026-06-02', 'Reunião — fechou moto');

-- ---------------------------------------------------------------------------
-- Contratos variados (usuario 4)
-- status: pending | approved | paid  (comissão)
-- client_status: ativo | inadimplente | quitado
-- lance_ofertado: 0 = ainda não | 1 = já ofertou
-- ---------------------------------------------------------------------------
INSERT INTO `consorcio_sales`
  (`id`, `usuario_id`, `empresa_id`, `lead_id`, `client_name`, `cpf`, `phone`, `email`,
   `product_type`, `card_value`, `down_payment`, `commission`, `status`, `client_status`,
   `sale_date`, `notes`, `installments`, `admin_fee`, `commission_percent`, `installment_value`,
   `lance_ofertado`, `dia_assembleia`, `data_assembleia`)
VALUES
  -- 401 Automóvel em dia, lance já ofertado na adesão
  (401, @uid, @eid, NULL, 'Rafael Souza', '321.654.987-00', '(11) 98888-1001', 'rafael.souza@email.com',
   'Automóvel', 85000.00, 8500.00, 3400.00, 'paid', 'ativo', '2025-10-05',
   'Cliente pontual. Lance na assembleia de out/2025.', 80, 20.00, 4.00, 1147.50,
   1, 12, '2025-11-12'),

  -- 402 Imóvel inadimplente, sem lance ainda
  (402, @uid, @eid, 402, 'Patricia Gomes', '456.789.123-00', '(11) 97777-2002', 'patricia.gomes@email.com',
   'Imóvel', 350000.00, 35000.00, 14000.00, 'approved', 'inadimplente', '2025-08-15',
   'Atraso desde mar/2026 — acionar cobrança.', 180, 20.00, 4.00, 2100.00,
   0, 5, NULL),

  -- 403 Moto quitada (amostra de 12 parcelas todas pagas)
  (403, @uid, @eid, 404, 'Henrique Almeida', '789.123.456-00', '(21) 95444-5500', 'henrique.a@email.com',
   'Moto', 28000.00, 2800.00, 1120.00, 'paid', 'quitado', '2025-06-01',
   'Contemplado por sorteio. Contrato encerrado na amostra.', 60, 20.00, 4.00, 504.00,
   0, 18, NULL),

  -- 404 Caminhão — lance registrado depois
  (404, @uid, @eid, NULL, 'Transportes Silva ME', '12.345.678/0001-90', '(19) 96666-3003', 'financeiro@silvame.com.br',
   'Caminhão', 420000.00, 42000.00, 16800.00, 'approved', 'ativo', '2026-01-20',
   'PJ — lance ofertado em assembleia de mai/2026.', 100, 20.00, 4.00, 4536.00,
   1, 8, '2026-05-08'),

  -- 405 Serviços — comissão pendente, adesão recente
  (405, @uid, @eid, NULL, 'Clínica Bem Estar', '98.765.432/0001-10', '(11) 95555-4004', 'contato@clinicabem.com',
   'Serviços', 95000.00, 9500.00, 3800.00, 'pending', 'ativo', '2026-04-10',
   'Equipamento médico — primeira parcela a vencer.', 72, 20.00, 4.00, 1416.67,
   0, 22, NULL),

  -- 406 Automóvel premium — inadimplente grave
  (406, @uid, @eid, NULL, 'Marcos Oliveira', '147.258.369-00', '(11) 94444-5005', 'marcos.oliveira@email.com',
   'Automóvel', 180000.00, 18000.00, 7200.00, 'paid', 'inadimplente', '2025-05-12',
   'Várias parcelas em atraso — negociar acordo.', 80, 20.00, 4.00, 2430.00,
   1, 10, '2025-09-10'),

  -- 407 Imóvel ativo, assembleia dia 20, sem lance
  (407, @uid, @eid, 401, 'Luciana Martins', '258.369.147-00', '(11) 98111-2200', 'luciana.m@email.com',
   'Imóvel', 420000.00, 42000.00, 16800.00, 'approved', 'ativo', '2026-03-01',
   'Aguardando primeira assembleia com lance.', 200, 20.00, 4.00, 2268.00,
   0, 20, NULL),

  -- 408 Automóvel aprovado — mix de parcelas
  (408, @uid, @eid, NULL, 'Fernanda Lima', '369.147.258-00', '(11) 93333-6006', 'fernanda.lima@email.com',
   'Automóvel', 65000.00, 6500.00, 2600.00, 'approved', 'ativo', '2025-12-01',
   'Bom pagador — 1 parcela em aberto no mês.', 80, 20.00, 4.00, 877.50,
   0, 15, NULL);

-- ---------------------------------------------------------------------------
-- Parcelas (12 por contrato — suficiente para demo; status coerente com call)
-- Referência: hoje ~ jun/2026
-- ---------------------------------------------------------------------------

-- 401: 9 pagas, 3 pendentes (futuro) → ativo
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (401, 1, '2025-11-05', 1147.50, '2025-11-04', 'paga'),
  (401, 2, '2025-12-05', 1147.50, '2025-12-03', 'paga'),
  (401, 3, '2026-01-05', 1147.50, '2026-01-06', 'paga'),
  (401, 4, '2026-02-05', 1147.50, '2026-02-05', 'paga'),
  (401, 5, '2026-03-05', 1147.50, '2026-03-04', 'paga'),
  (401, 6, '2026-04-05', 1147.50, '2026-04-07', 'paga'),
  (401, 7, '2026-05-05', 1147.50, '2026-05-05', 'paga'),
  (401, 8, '2026-06-05', 1147.50, '2026-06-02', 'paga'),
  (401, 9, '2026-07-05', 1147.50, '2026-06-28', 'paga'),
  (401, 10, '2026-08-05', 1147.50, NULL, 'pendente'),
  (401, 11, '2026-09-05', 1147.50, NULL, 'pendente'),
  (401, 12, '2026-10-05', 1147.50, NULL, 'pendente');

-- 402: 5 pagas, 4 atrasadas, 3 pendentes → inadimplente
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (402, 1, '2025-09-15', 2100.00, '2025-09-14', 'paga'),
  (402, 2, '2025-10-15', 2100.00, '2025-10-15', 'paga'),
  (402, 3, '2025-11-15', 2100.00, '2025-11-18', 'paga'),
  (402, 4, '2025-12-15', 2100.00, '2025-12-14', 'paga'),
  (402, 5, '2026-01-15', 2100.00, '2026-01-16', 'paga'),
  (402, 6, '2026-02-15', 2100.00, NULL, 'atrasada'),
  (402, 7, '2026-03-15', 2100.00, NULL, 'atrasada'),
  (402, 8, '2026-04-15', 2100.00, NULL, 'atrasada'),
  (402, 9, '2026-05-15', 2100.00, NULL, 'atrasada'),
  (402, 10, '2026-06-15', 2100.00, NULL, 'pendente'),
  (402, 11, '2026-07-15', 2100.00, NULL, 'pendente'),
  (402, 12, '2026-08-15', 2100.00, NULL, 'pendente');

-- 403: 12 pagas → quitado (na amostra)
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (403, 1, '2025-07-01', 504.00, '2025-07-01', 'paga'),
  (403, 2, '2025-08-01', 504.00, '2025-08-02', 'paga'),
  (403, 3, '2025-09-01', 504.00, '2025-09-01', 'paga'),
  (403, 4, '2025-10-01', 504.00, '2025-10-03', 'paga'),
  (403, 5, '2025-11-01', 504.00, '2025-11-01', 'paga'),
  (403, 6, '2025-12-01', 504.00, '2025-12-01', 'paga'),
  (403, 7, '2026-01-01', 504.00, '2026-01-02', 'paga'),
  (403, 8, '2026-02-01', 504.00, '2026-02-01', 'paga'),
  (403, 9, '2026-03-01', 504.00, '2026-03-03', 'paga'),
  (403, 10, '2026-04-01', 504.00, '2026-04-01', 'paga'),
  (403, 11, '2026-05-01', 504.00, '2026-05-02', 'paga'),
  (403, 12, '2026-06-01', 504.00, '2026-06-01', 'paga');

-- 404: caminhão — 4 pagas, restante pendente
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (404, 1, '2026-02-20', 4536.00, '2026-02-19', 'paga'),
  (404, 2, '2026-03-20', 4536.00, '2026-03-20', 'paga'),
  (404, 3, '2026-04-20', 4536.00, '2026-04-21', 'paga'),
  (404, 4, '2026-05-20', 4536.00, '2026-05-20', 'paga'),
  (404, 5, '2026-06-20', 4536.00, NULL, 'pendente'),
  (404, 6, '2026-07-20', 4536.00, NULL, 'pendente'),
  (404, 7, '2026-08-20', 4536.00, NULL, 'pendente'),
  (404, 8, '2026-09-20', 4536.00, NULL, 'pendente'),
  (404, 9, '2026-10-20', 4536.00, NULL, 'pendente'),
  (404, 10, '2026-11-20', 4536.00, NULL, 'pendente'),
  (404, 11, '2026-12-20', 4536.00, NULL, 'pendente'),
  (404, 12, '2027-01-20', 4536.00, NULL, 'pendente');

-- 405: serviços — 2 pagas, 1 atrasada leve
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (405, 1, '2026-05-10', 1416.67, '2026-05-09', 'paga'),
  (405, 2, '2026-06-10', 1416.67, NULL, 'pendente'),
  (405, 3, '2026-07-10', 1416.67, NULL, 'pendente'),
  (405, 4, '2026-08-10', 1416.67, NULL, 'pendente'),
  (405, 5, '2026-09-10', 1416.67, NULL, 'pendente'),
  (405, 6, '2026-10-10', 1416.67, NULL, 'pendente'),
  (405, 7, '2026-11-10', 1416.67, NULL, 'pendente'),
  (405, 8, '2026-12-10', 1416.67, NULL, 'pendente'),
  (405, 9, '2027-01-10', 1416.67, NULL, 'pendente'),
  (405, 10, '2027-02-10', 1416.67, NULL, 'pendente'),
  (405, 11, '2027-03-10', 1416.67, NULL, 'pendente'),
  (405, 12, '2027-04-10', 1416.67, NULL, 'pendente');

-- 406: inadimplente grave — 3 pagas, 6 atrasadas
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (406, 1, '2025-06-12', 2430.00, '2025-06-11', 'paga'),
  (406, 2, '2025-07-12', 2430.00, '2025-07-14', 'paga'),
  (406, 3, '2025-08-12', 2430.00, '2025-08-12', 'paga'),
  (406, 4, '2025-09-12', 2430.00, NULL, 'atrasada'),
  (406, 5, '2025-10-12', 2430.00, NULL, 'atrasada'),
  (406, 6, '2025-11-12', 2430.00, NULL, 'atrasada'),
  (406, 7, '2025-12-12', 2430.00, NULL, 'atrasada'),
  (406, 8, '2026-01-12', 2430.00, NULL, 'atrasada'),
  (406, 9, '2026-02-12', 2430.00, NULL, 'atrasada'),
  (406, 10, '2026-03-12', 2430.00, NULL, 'atrasada'),
  (406, 11, '2026-04-12', 2430.00, NULL, 'pendente'),
  (406, 12, '2026-05-12', 2430.00, NULL, 'pendente');

-- 407: imóvel recente — 3 pagas
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (407, 1, '2026-04-01', 2268.00, '2026-04-02', 'paga'),
  (407, 2, '2026-05-01', 2268.00, '2026-05-01', 'paga'),
  (407, 3, '2026-06-01', 2268.00, '2026-06-02', 'paga'),
  (407, 4, '2026-07-01', 2268.00, NULL, 'pendente'),
  (407, 5, '2026-08-01', 2268.00, NULL, 'pendente'),
  (407, 6, '2026-09-01', 2268.00, NULL, 'pendente'),
  (407, 7, '2026-10-01', 2268.00, NULL, 'pendente'),
  (407, 8, '2026-11-01', 2268.00, NULL, 'pendente'),
  (407, 9, '2026-12-01', 2268.00, NULL, 'pendente'),
  (407, 10, '2027-01-01', 2268.00, NULL, 'pendente'),
  (407, 11, '2027-02-01', 2268.00, NULL, 'pendente'),
  (407, 12, '2027-03-01', 2268.00, NULL, 'pendente');

-- 408: automóvel — 7 pagas, 1 atrasada, resto pendente
INSERT INTO `consorcio_parcelas` (`sale_id`, `numero`, `due_date`, `amount`, `paid_at`, `status`) VALUES
  (408, 1, '2026-01-01', 877.50, '2025-12-30', 'paga'),
  (408, 2, '2026-02-01', 877.50, '2026-02-03', 'paga'),
  (408, 3, '2026-03-01', 877.50, '2026-03-01', 'paga'),
  (408, 4, '2026-04-01', 877.50, '2026-04-01', 'paga'),
  (408, 5, '2026-05-01', 877.50, '2026-05-02', 'paga'),
  (408, 6, '2026-06-01', 877.50, '2026-06-01', 'paga'),
  (408, 7, '2026-07-01', 877.50, NULL, 'atrasada'),
  (408, 8, '2026-08-01', 877.50, NULL, 'pendente'),
  (408, 9, '2026-09-01', 877.50, NULL, 'pendente'),
  (408, 10, '2026-10-01', 877.50, NULL, 'pendente'),
  (408, 11, '2026-11-01', 877.50, NULL, 'pendente'),
  (408, 12, '2026-12-01', 877.50, NULL, 'pendente');

-- Sincroniza client_status com as parcelas inseridas
UPDATE consorcio_sales s SET client_status = 'quitado' WHERE s.id = 403;
UPDATE consorcio_sales s SET client_status = 'inadimplente' WHERE s.id IN (402, 406);
UPDATE consorcio_sales s SET client_status = 'inadimplente' WHERE s.id = 408;
UPDATE consorcio_sales s SET client_status = 'ativo' WHERE s.id IN (401, 404, 405, 407);

SELECT CONCAT('Seed call OK — ', COUNT(*), ' contratos para usuario ', @uid) AS resultado
FROM consorcio_sales WHERE usuario_id = @uid AND id BETWEEN 401 AND 408;
