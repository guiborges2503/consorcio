-- Consórcio — SQLite (padrão em dev). Para MySQL use database/schema.sql
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS consorcio_lead_interactions;
DROP TABLE IF EXISTS consorcio_sales;
DROP TABLE IF EXISTS consorcio_leads;
DROP TABLE IF EXISTS consorcio_usuarios;

PRAGMA foreign_keys = ON;

CREATE TABLE consorcio_usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ATIVO',
  month_goal REAL NOT NULL DEFAULT 500000
);

CREATE TABLE consorcio_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'warm',
  last_contact TEXT NOT NULL,
  next_action TEXT NOT NULL DEFAULT '',
  interest INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES consorcio_usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_leads_user ON consorcio_leads(usuario_id);
CREATE INDEX idx_leads_status ON consorcio_leads(status);

CREATE TABLE consorcio_lead_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (lead_id) REFERENCES consorcio_leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_int_lead ON consorcio_lead_interactions(lead_id);

CREATE TABLE consorcio_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  lead_id INTEGER,
  client_name TEXT NOT NULL,
  cpf TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT 'Automóvel',
  card_value REAL NOT NULL,
  commission REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sale_date TEXT NOT NULL,
  notes TEXT,
  installments INTEGER NOT NULL DEFAULT 80,
  admin_fee REAL NOT NULL DEFAULT 20,
  commission_percent REAL NOT NULL DEFAULT 4,
  installment_value REAL,
  FOREIGN KEY (usuario_id) REFERENCES consorcio_usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES consorcio_leads(id) ON DELETE SET NULL
);

CREATE INDEX idx_sales_user ON consorcio_sales(usuario_id);
CREATE INDEX idx_sales_status ON consorcio_sales(status);
CREATE INDEX idx_sales_date ON consorcio_sales(sale_date);

INSERT INTO consorcio_usuarios (id, login, senha, nome, email, status, month_goal) VALUES
(1, 'admin', '0192023a7bbd73250516f069df18b500', 'Carlos Silva', 'carlos@local.dev', 'ATIVO', 500000),
(2, 'amanda', '0192023a7bbd73250516f069df18b500', 'Amanda Rodrigues', 'amanda@local.dev', 'ATIVO', 500000),
(3, 'bruno', '0192023a7bbd73250516f069df18b500', 'Bruno Costa', 'bruno@local.dev', 'ATIVO', 500000);

INSERT INTO consorcio_leads (id, usuario_id, name, phone, email, status, last_contact, next_action, interest, notes, created_at) VALUES
(1, 1, 'Maria Santos', '(11) 98765-4321', 'maria.santos@email.com', 'hot', '2026-03-30', 'Enviar proposta final', 90, 'Interessada em carta de R$ 80.000 para automóvel', '2026-03-15 10:00:00'),
(2, 1, 'João Oliveira', '(11) 97654-3210', 'joao.oliveira@email.com', 'warm', '2026-03-29', 'Agendar reunião presencial', 65, 'Quer consórcio imobiliário de R$ 200.000', '2026-03-20 10:00:00'),
(3, 1, 'Ana Paula Costa', '(11) 96543-2109', 'ana.costa@email.com', 'cold', '2026-03-25', 'Retomar contato', 30, 'Pediu tempo para pensar', '2026-03-10 10:00:00'),
(4, 1, 'Pedro Mendes', '(11) 95432-1098', 'pedro.mendes@email.com', 'hot', '2026-03-31', 'Fechar negócio', 95, 'Pronto para assinar contrato de R$ 50.000', '2026-03-22 10:00:00'),
(5, 1, 'Juliana Ferreira', '(11) 94321-0987', 'juliana.ferreira@email.com', 'warm', '2026-03-28', 'Enviar simulação', 70, 'Quer comparar com outras opções', '2026-03-18 10:00:00'),
(6, 1, 'Roberto Lima', '(11) 93210-9876', 'roberto.lima@email.com', 'cold', '2026-03-20', 'Retomar em 1 semana', 25, 'Sem orçamento no momento', '2026-03-05 10:00:00');

INSERT INTO consorcio_lead_interactions (id, lead_id, type, date, notes) VALUES
(1, 1, 'call', '2026-03-30', 'Ligação - Negociou condições'),
(2, 1, 'whatsapp', '2026-03-28', 'WhatsApp - Enviou documentos'),
(3, 2, 'whatsapp', '2026-03-29', 'WhatsApp - Tirou dúvidas'),
(4, 3, 'call', '2026-03-25', 'Ligação - Não demonstrou interesse'),
(5, 4, 'meeting', '2026-03-31', 'Reunião - Acertou todos os detalhes'),
(6, 4, 'call', '2026-03-30', 'Ligação - Confirmou interesse'),
(7, 5, 'email', '2026-03-28', 'Email - Solicitou simulação'),
(8, 6, 'whatsapp', '2026-03-20', 'WhatsApp - Sem condições agora');

INSERT INTO consorcio_sales (id, usuario_id, lead_id, client_name, cpf, phone, email, product_type, card_value, commission, status, sale_date, notes, installments, admin_fee, commission_percent) VALUES
(1, 1, NULL, 'Carlos Eduardo', '000', '(11)90000-0001', 'c@e.com', 'Automóvel', 80000, 3200, 'paid', '2026-03-15', '', 80, 20, 4),
(2, 1, NULL, 'Fernanda Silva', '000', '(11)90000-0002', 'f@s.com', 'Imóvel', 150000, 6000, 'approved', '2026-03-20', '', 80, 20, 4),
(3, 1, NULL, 'Ricardo Alves', '000', '(11)90000-0003', 'r@a.com', 'Automóvel', 50000, 2000, 'paid', '2026-03-10', '', 80, 20, 4),
(4, 1, NULL, 'Patricia Gomes', '000', '(11)90000-0004', 'p@g.com', 'Imóvel', 200000, 8000, 'pending', '2026-03-28', '', 80, 20, 4),
(5, 1, NULL, 'Marcos Santos', '000', '(11)90000-0005', 'm@s.com', 'Automóvel', 60000, 2400, 'approved', '2026-03-25', '', 80, 20, 4),
(6, 2, NULL, 'Cliente Amanda A', '000', '(11)91111-1111', 'a@a.com', 'Imóvel', 120000, 4800, 'paid', '2026-03-12', '', 80, 20, 4),
(7, 2, NULL, 'Cliente Amanda B', '000', '(11)92222-2222', 'b@b.com', 'Automóvel', 90000, 3600, 'paid', '2026-03-18', '', 80, 20, 4),
(8, 3, NULL, 'Cliente Bruno A', '000', '(11)93333-3333', 'c@c.com', 'Automóvel', 70000, 2800, 'paid', '2026-03-14', '', 80, 20, 4);
