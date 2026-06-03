import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { DollarSign, Calculator, CheckCircle, User, ClipboardList } from "lucide-react";
import type { Lead, Sale } from "../types/domain";
import { toast } from "sonner";
import { apiGet, apiPost } from "../lib/api";
import {
  formatCurrency,
  formatCurrencyDigits,
  createCurrencyInputHandlers,
  parseCurrencyDigits,
  parsePastedCurrency,
  reaisToCurrencyDigits,
  roundCurrency,
} from "../lib/format";

const initialForm = () => ({
  clientName: "",
  cpf: "",
  phone: "",
  email: "",
  productType: "Automóvel",
  cardValue: "",
  downPayment: "",
  installments: "80",
  installmentDigits: "",
  adminFee: "20",
  commissionPercent: "4",
  commissionValue: "",
  saleDate: new Date().toISOString().split("T")[0],
  diaAssembleia: "10",
  lanceOfertado: "NAO" as "SIM" | "NAO",
  dataAssembleia: "",
  notes: "",
});

interface NewSaleFormProps {
  leadId?: string;
  onSuccess?: (sale: Sale) => void;
  onCancel?: () => void;
}

export function NewSaleForm({ leadId, onSuccess, onCancel }: NewSaleFormProps) {
  const [leadList, setLeadList] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(leadId);
  const [saving, setSaving] = useState(false);
  const [installmentManual, setInstallmentManual] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  function getTotalFinanced(): number {
    const cardValue = parseCurrencyDigits(formData.cardValue);
    const downPayment = parseCurrencyDigits(formData.downPayment);
    const remaining = Math.max(0, cardValue - downPayment);
    const adminFee = parseFloat(formData.adminFee) || 0;
    return roundCurrency(remaining + (remaining * adminFee) / 100);
  }

  const loadLeads = useCallback(async () => {
    try {
      const r = await apiGet<{ leads?: Lead[] }>("/leads.php");
      setLeadList(r.leads ?? []);
    } catch {
      setLeadList([]);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (!leadId) return;
    setSelectedLeadId(leadId);
    (async () => {
      try {
        const r = await apiGet<{ lead?: Lead }>(`/lead.php?id=${encodeURIComponent(leadId)}`);
        const L = r.lead;
        if (L) {
          setFormData((prev) => ({
            ...prev,
            clientName: L.name,
            phone: L.phone,
            email: L.email,
            notes: L.notes,
          }));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [leadId]);

  useEffect(() => {
    if (formData.cardValue && formData.commissionPercent) {
      const cardValue = parseCurrencyDigits(formData.cardValue);
      const percent = parseFloat(formData.commissionPercent) || 0;
      const commission = (cardValue * percent) / 100;
      setFormData((prev) => ({
        ...prev,
        commissionValue: commission.toFixed(2),
      }));
    }
  }, [formData.cardValue, formData.commissionPercent]);

  useEffect(() => {
    if (!installmentManual && formData.cardValue && formData.installments) {
      const n = parseInt(formData.installments, 10) || 1;
      const totalFinanced = getTotalFinanced();
      if (totalFinanced > 0 && n > 0) {
        const suggested = roundCurrency(totalFinanced / n);
        setFormData((prev) => ({
          ...prev,
          installmentDigits: reaisToCurrencyDigits(suggested),
        }));
      }
    }
  }, [
    formData.cardValue,
    formData.downPayment,
    formData.installments,
    formData.adminFee,
    installmentManual,
  ]);

  const cardValueReais = parseCurrencyDigits(formData.cardValue);

  const requiredFieldsFilled =
    !!formData.clientName.trim() &&
    !!formData.cpf.trim() &&
    !!formData.phone.trim() &&
    cardValueReais > 0;

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!formData.clientName.trim()) missing.push("Nome Completo");
    if (!formData.cpf.trim()) missing.push("CPF/CNPJ");
    if (!formData.phone.trim()) missing.push("Telefone");
    if (!cardValueReais) missing.push("Valor do Contrato");
    return missing;
  }, [cardValueReais, formData.clientName, formData.cpf, formData.phone]);

  function setCurrencyField(
    field: "cardValue" | "downPayment" | "installmentDigits",
    digits: string,
    manualInstallment = false
  ) {
    const clean = digits.replace(/\D/g, "").slice(0, 13);
    setFormData((prev) => ({
      ...prev,
      [field]: clean,
    }));
    if (field === "installmentDigits") {
      setInstallmentManual(manualInstallment);
    } else {
      setInstallmentManual(false);
    }
  }

  const cardValueHandlers = createCurrencyInputHandlers(formData.cardValue, (d) =>
    setCurrencyField("cardValue", d)
  );
  const downPaymentHandlers = createCurrencyInputHandlers(formData.downPayment, (d) =>
    setCurrencyField("downPayment", d)
  );
  const installmentHandlers = createCurrencyInputHandlers(formData.installmentDigits, (d) =>
    setCurrencyField("installmentDigits", d, true)
  );

  const totalFinanced = getTotalFinanced();
  const installmentsCount = parseInt(formData.installments, 10) || 0;
  const parcelaReais = parseCurrencyDigits(formData.installmentDigits);
  const sumParcelas =
    installmentsCount > 0
      ? roundCurrency(parcelaReais * Math.max(0, installmentsCount - 1))
      : 0;
  const ultimaParcela =
    installmentsCount > 0 ? roundCurrency(totalFinanced - sumParcelas) : 0;
  const divisaoFecha =
    installmentsCount > 0 && Math.abs(parcelaReais * installmentsCount - totalFinanced) < 0.02;

  const handleSelectLead = (lid: string) => {
    setSelectedLeadId(lid);
    const selectedLead = leadList.find((l) => l.id === lid);
    if (selectedLead) {
      setFormData((prev) => ({
        ...prev,
        clientName: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email,
        notes: selectedLead.notes,
      }));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.clientName || !formData.cpf || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const cardNum = cardValueReais;
    if (!cardNum) {
      toast.error("Informe um valor válido para o contrato");
      return;
    }

    if (!formData.diaAssembleia) {
      toast.error("Informe o dia fixo da assembleia");
      return;
    }
    if (formData.lanceOfertado === "SIM" && !formData.dataAssembleia) {
      toast.error("Informe a data da assembleia em que o lance foi ofertado");
      return;
    }

    const effectiveLeadId = leadId ?? selectedLeadId;

    const parcelaEnvio =
      parcelaReais > 0
        ? parcelaReais
        : installmentsCount > 0
          ? roundCurrency(totalFinanced / installmentsCount)
          : 0;

    try {
      setSaving(true);
      const res = await apiPost<{ sale?: Sale }>("/sales.php", {
        clientName: formData.clientName,
        cpf: formData.cpf,
        phone: formData.phone,
        email: formData.email,
        productType: formData.productType,
        cardValue: cardNum,
        downPayment: parseCurrencyDigits(formData.downPayment),
        commissionPercent: parseFloat(formData.commissionPercent) || 4,
        saleDate: formData.saleDate,
        notes: formData.notes,
        installments: installmentsCount || 80,
        adminFee: parseFloat(formData.adminFee) || 20,
        installmentValue: parcelaEnvio,
        diaAssembleia: Number(formData.diaAssembleia),
        lanceOfertado: formData.lanceOfertado === "SIM",
        dataAssembleia:
          formData.lanceOfertado === "SIM" ? formData.dataAssembleia : undefined,
        leadId: effectiveLeadId ? parseInt(effectiveLeadId, 10) : undefined,
      });
      toast.success("Contrato cadastrado com sucesso.", {
        description: `Cliente: ${formData.clientName} | Valor: ${formatCurrency(cardNum)}`,
      });
      if (res.sale) {
        onSuccess?.(res.sale);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar contrato");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {!leadId && (
        <Card className="rounded-xl border border-border/80 bg-muted/30 p-4">
          <Label className="text-sm font-medium mb-2 block">
            Converter Lead em Contrato (Opcional)
          </Label>
          <Select value={selectedLeadId} onValueChange={handleSelectLead}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione um lead..." />
            </SelectTrigger>
            <SelectContent>
              {leadList.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} - {l.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      <Card className="rounded-2xl border border-border/80 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted">
            <User className="h-4 w-4 text-slate-600" />
          </span>
          Dados do cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Nome Completo *</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
              placeholder="Nome do cliente"
              className="rounded-xl mt-1"
              autoFocus
              required
            />
          </div>
          <div>
            <Label htmlFor="cpf">CPF/CNPJ *</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value }))}
              placeholder="000.000.000-00"
              className="rounded-xl mt-1"
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 98765-4321"
              className="rounded-xl mt-1"
              inputMode="tel"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="cliente@email.com"
              className="rounded-xl mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted">
            <ClipboardList className="h-4 w-4 text-slate-600" />
          </span>
          Dados do contrato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="productType">Tipo de Contrato *</Label>
            <Select
              value={formData.productType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, productType: value }))}
            >
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Automóvel">Automóvel</SelectItem>
                <SelectItem value="Imóvel">Imóvel</SelectItem>
                <SelectItem value="Moto">Moto</SelectItem>
                <SelectItem value="Caminhão">Caminhão</SelectItem>
                <SelectItem value="Serviços">Serviços</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cardValue">Valor Total do Contrato *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                id="cardValue"
                inputMode="numeric"
                value={formatCurrencyDigits(formData.cardValue)}
                onKeyDown={cardValueHandlers.onKeyDown}
                onPaste={cardValueHandlers.onPaste}
                onChange={(e) => {
                  const d = parsePastedCurrency(e.target.value);
                  if (d.length > formData.cardValue.length + 1) {
                    setCurrencyField("cardValue", d);
                  }
                }}
                placeholder="0,00"
                className="rounded-xl pl-10"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="downPayment">Entrada</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                id="downPayment"
                inputMode="numeric"
                value={formatCurrencyDigits(formData.downPayment)}
                onKeyDown={downPaymentHandlers.onKeyDown}
                onPaste={downPaymentHandlers.onPaste}
                onChange={(e) => {
                  const d = parsePastedCurrency(e.target.value);
                  if (d.length > formData.downPayment.length + 1) {
                    setCurrencyField("downPayment", d);
                  }
                }}
                placeholder="0,00"
                className="rounded-xl pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="installments">Número de Parcelas *</Label>
            <Select
              value={formData.installments}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, installments: value }))}
            >
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="40">40 meses</SelectItem>
                <SelectItem value="50">50 meses</SelectItem>
                <SelectItem value="60">60 meses</SelectItem>
                <SelectItem value="70">70 meses</SelectItem>
                <SelectItem value="80">80 meses</SelectItem>
                <SelectItem value="100">100 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="adminFee">Taxa de Administração (%)</Label>
            <Input
              id="adminFee"
              type="number"
              value={formData.adminFee}
              onChange={(e) => setFormData((prev) => ({ ...prev, adminFee: e.target.value }))}
              placeholder="20"
              className="rounded-xl mt-1"
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="installmentDigits">Valor da Parcela *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                id="installmentDigits"
                inputMode="numeric"
                value={formatCurrencyDigits(formData.installmentDigits)}
                onKeyDown={installmentHandlers.onKeyDown}
                onPaste={installmentHandlers.onPaste}
                onChange={(e) => {
                  const d = parsePastedCurrency(e.target.value);
                  if (d.length > formData.installmentDigits.length + 1) {
                    setCurrencyField("installmentDigits", d, true);
                  }
                }}
                placeholder="0,00"
                className="rounded-xl pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Digite os números (ex.: 16000000 → R$ 160.000,00) ou cole 160.000,50. Backspace apaga.
              {installmentManual ? " Parcela definida por você." : " Calculada automaticamente."}
            </p>
            {installmentsCount > 1 && totalFinanced > 0 && parcelaReais > 0 && !divisaoFecha && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2">
                A divisão não fecha exato: parcelas 1–{installmentsCount - 1} de{" "}
                {formatCurrency(parcelaReais)} e a <strong>última</strong> de{" "}
                {formatCurrency(ultimaParcela)} (total {formatCurrency(totalFinanced)}).
              </p>
            )}
            {installmentsCount > 0 && parcelaReais > 0 && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs mt-1"
                onClick={() => setInstallmentManual(false)}
              >
                Recalcular parcela pelo total
              </Button>
            )}
          </div>
          <div>
            <Label htmlFor="saleDate">Data do Contrato</Label>
            <Input
              id="saleDate"
              type="date"
              value={formData.saleDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, saleDate: e.target.value }))}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label htmlFor="diaAssembleia">Dia fixo da assembleia *</Label>
            <Select
              value={formData.diaAssembleia}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, diaAssembleia: value }))}
            >
              <SelectTrigger id="diaAssembleia" className="rounded-xl mt-1">
                <SelectValue placeholder="Dia do mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => {
                  const dia = String(i + 1);
                  return (
                    <SelectItem key={dia} value={dia}>
                      Dia {dia} de cada mês
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              Dia recorrente do grupo — ex.: assembleia todo dia 15.
            </p>
          </div>
          <div>
            <Label htmlFor="lanceOfertado">Lance ofertado?</Label>
            <Select
              value={formData.lanceOfertado}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  lanceOfertado: value as "SIM" | "NAO",
                  dataAssembleia: value === "NAO" ? "" : prev.dataAssembleia,
                }))
              }
            >
              <SelectTrigger id="lanceOfertado" className="rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAO">Ainda não</SelectItem>
                <SelectItem value="SIM">Sim, já ofertou</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {formData.lanceOfertado === "NAO"
                ? "Sem problema — você pode registrar o lance depois na lista de contratos."
                : "Informe a data da assembleia em que o lance foi dado."}
            </p>
          </div>
          {formData.lanceOfertado === "SIM" && (
            <div>
              <Label htmlFor="dataAssembleia">Data da assembleia (lance) *</Label>
              <Input
                id="dataAssembleia"
                type="date"
                value={formData.dataAssembleia}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dataAssembleia: e.target.value }))
                }
                className="rounded-xl mt-1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Data em que o lance foi ofertado na assembleia.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-emerald-100/90 bg-emerald-50/40 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-slate-600" />
          Cálculo de Comissão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="commissionPercent">Percentual de Comissão (%)</Label>
            <Input
              id="commissionPercent"
              type="number"
              value={formData.commissionPercent}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, commissionPercent: e.target.value }))
              }
              placeholder="4"
              className="rounded-xl mt-1"
              step="0.1"
            />
          </div>
          <div>
            <Label htmlFor="commissionValue">Sua Comissão</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
              <Input
                id="commissionValue"
                value={
                  formData.commissionValue
                    ? `R$ ${parseFloat(formData.commissionValue).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    : "R$ 0,00"
                }
                readOnly
                className="rounded-xl border-border bg-muted/50 pl-10 text-lg font-semibold"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 p-6">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Informações adicionais sobre o contrato..."
          className="rounded-xl mt-2 min-h-[100px]"
        />
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-muted/20 p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo do Contrato</h3>
        {missingRequiredFields.length > 0 && (
          <p className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Falta preencher: {missingRequiredFields.join(", ")}.
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-semibold">{formData.clientName || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="font-semibold tabular-nums">
              {cardValueReais > 0 ? formatCurrency(cardValueReais) : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Parcela</p>
            <p className="font-semibold">
              {parcelaReais > 0 ? formatCurrency(parcelaReais) : "—"}
              {installmentsCount > 1 && !divisaoFecha && parcelaReais > 0 && (
                <span className="text-xs font-normal text-muted-foreground block">
                  última: {formatCurrency(ultimaParcela)}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Comissão</p>
            <p className="font-semibold tabular-nums text-emerald-800/90">
              R${" "}
              {formData.commissionValue
                ? parseFloat(formData.commissionValue).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })
                : "0,00"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dia da assembleia</p>
            <p className="font-semibold">
              {formData.diaAssembleia ? `Dia ${formData.diaAssembleia} de cada mês` : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lance ofertado</p>
            <p className="font-semibold">
              {formData.lanceOfertado === "SIM"
                ? "Sim, já ofertou"
                : formData.lanceOfertado === "NAO"
                  ? "Ainda não"
                  : "—"}
            </p>
          </div>
          {formData.lanceOfertado === "SIM" && (
            <div>
              <p className="text-sm text-muted-foreground">Data do lance</p>
              <p className="font-semibold">
                {formData.dataAssembleia
                  ? new Date(formData.dataAssembleia + "T12:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3 justify-end pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl h-12 px-6">
            Cancelar
          </Button>
        ) : (
          <Link to="/contratos">
            <Button type="button" variant="outline" className="rounded-xl h-12 px-6">
              Cancelar
            </Button>
          </Link>
        )}
        <Button
          type="submit"
          disabled={!requiredFieldsFilled || saving}
          className="rounded-xl h-12 px-8"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Cadastrar Contrato"}
        </Button>
      </div>
    </form>
  );
}
