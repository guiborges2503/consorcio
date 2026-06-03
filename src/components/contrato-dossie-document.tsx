import type { ReactNode } from "react";
import type { Parcela, Sale } from "../types/domain";
import { formatCurrency, formatDate } from "../lib/format";

function DossieRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-200 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-full shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-44">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function DossieSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 border-b-2 border-slate-800 pb-1 text-sm font-bold uppercase tracking-wide text-slate-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

const parcelaStatusLabel: Record<Parcela["status"], string> = {
  paga: "Paga",
  pendente: "Pendente",
  atrasada: "Atrasada",
};

export function ContratoDossieDocument({ sale }: { sale: Sale }) {
  const geradoEm = new Date().toLocaleString("pt-BR");
  const totalFinanced =
    sale.installments && sale.installmentValue
      ? sale.installmentValue * sale.installments
      : null;
  const resumo = sale.parcelasResumo;
  const parcelas = sale.parcelas ?? [];

  return (
    <article className="dossie-document mx-auto max-w-[210mm] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-8 print:shadow-none">
      <header className="mb-8 border-b border-slate-300 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Contempla
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Dossiê do consórcio</h1>
            <p className="mt-1 text-sm text-slate-600">Ficha consolidada do cliente e do contrato</p>
          </div>
          <div className="text-left text-sm text-slate-600 sm:text-right">
            <p>
              Contrato nº <strong className="text-slate-900">{sale.id}</strong>
            </p>
            <p>Gerado em {geradoEm}</p>
          </div>
        </div>
      </header>

      <DossieSection title="Cliente">
        <dl>
          <DossieRow label="Nome" value={sale.clientName} />
          <DossieRow label="CPF/CNPJ" value={sale.cpf ?? ""} />
          <DossieRow label="Telefone" value={sale.phone ?? ""} />
          <DossieRow label="E-mail" value={sale.email ?? ""} />
        </dl>
      </DossieSection>

      <DossieSection title="Contrato">
        <dl>
          <DossieRow label="Tipo" value={sale.productType} />
          <DossieRow label="Data do contrato" value={formatDate(sale.date)} />
          <DossieRow label="Valor total" value={formatCurrency(sale.cardValue)} />
          <DossieRow label="Entrada à vista" value={formatCurrency(sale.downPayment ?? 0)} />
          <DossieRow
            label="Parcelas (plano)"
            value={
              sale.installments && sale.installmentValue
                ? `${sale.installments}x de ${formatCurrency(sale.installmentValue)}`
                : "—"
            }
          />
          {totalFinanced !== null && (
            <DossieRow label="Total financiado (est.)" value={formatCurrency(totalFinanced)} />
          )}
          {sale.adminFee !== undefined && (
            <DossieRow label="Taxa administrativa" value={`${sale.adminFee}%`} />
          )}
          {sale.commissionPercent !== undefined && (
            <DossieRow
              label="Comissão"
              value={`${sale.commissionPercent}% (${formatCurrency(sale.commission)})`}
            />
          )}
          <DossieRow
            label="Situação do cliente"
            value={
              sale.clientStatus === "inadimplente"
                ? "Inadimplente"
                : sale.clientStatus === "quitado"
                  ? "Quitado"
                  : "Ativo"
            }
          />
        </dl>
      </DossieSection>

      <DossieSection title="Parcelas">
        {resumo && resumo.total > 0 ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
                <p className="text-xs font-semibold uppercase text-emerald-800">Pagas</p>
                <p className="text-lg font-bold text-emerald-900">{resumo.pagas}</p>
                <p className="text-xs text-emerald-800">{formatCurrency(resumo.valorPago)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Pendentes</p>
                <p className="text-lg font-bold text-slate-900">{resumo.pendentes}</p>
                <p className="text-xs text-slate-600">{formatCurrency(resumo.valorPendente)}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-3">
                <p className="text-xs font-semibold uppercase text-red-800">Atrasadas</p>
                <p className="text-lg font-bold text-red-900">{resumo.atrasadas}</p>
                <p className="text-xs text-red-800">{formatCurrency(resumo.valorAtrasado)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Total no plano</p>
                <p className="text-lg font-bold text-slate-900">{resumo.total}</p>
                <p className="text-xs text-slate-600">parcelas cadastradas</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-600">
                    <th className="py-2 pr-3 font-semibold">Nº</th>
                    <th className="py-2 pr-3 font-semibold">Vencimento</th>
                    <th className="py-2 pr-3 font-semibold">Valor</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="py-2 pr-3 tabular-nums">{p.numero}</td>
                      <td className="py-2 pr-3">{formatDate(p.dueDate)}</td>
                      <td className="py-2 pr-3 tabular-nums">{formatCurrency(p.amount)}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            p.status === "paga"
                              ? "text-emerald-800"
                              : p.status === "atrasada"
                                ? "text-red-800 font-medium"
                                : "text-slate-700"
                          }
                        >
                          {parcelaStatusLabel[p.status]}
                        </span>
                      </td>
                      <td className="py-2">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Nenhuma parcela cadastrada para este contrato.</p>
        )}
      </DossieSection>

      <DossieSection title="Assembleia e lance">
        <dl>
          <DossieRow
            label="Dia fixo da assembleia"
            value={sale.diaAssembleia ? `Dia ${sale.diaAssembleia} de cada mês` : "—"}
          />
          <DossieRow
            label="Lance ofertado"
            value={sale.lanceOfertado ? "Sim" : "Ainda não"}
          />
          {sale.lanceOfertado && sale.dataAssembleia && (
            <DossieRow label="Data do lance" value={formatDate(sale.dataAssembleia)} />
          )}
        </dl>
      </DossieSection>

      {(sale.sellerName || sale.notes) && (
        <DossieSection title="Complementos">
          <dl>
            {sale.sellerName && <DossieRow label="Consultor(a)" value={sale.sellerName} />}
            {sale.notes && <DossieRow label="Observações" value={sale.notes} />}
          </dl>
        </DossieSection>
      )}

      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        Documento informativo gerado pelo sistema Contempla para apoio comercial e acompanhamento
        interno. Não substitui contrato ou documentos oficiais da administradora do consórcio.
      </footer>
    </article>
  );
}
