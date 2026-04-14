import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { DollarSign, Calculator, CheckCircle } from "lucide-react";
import type { Lead } from "../types/domain";
import { toast } from "sonner";
import { apiGet, apiPost } from "../lib/api";

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  onSaved?: () => void;
}

export function NewSaleDialog({ open, onOpenChange, leadId, onSaved }: NewSaleDialogProps) {
  const [leadList, setLeadList] = useState<Lead[]>([]);

  const [formData, setFormData] = useState({
    clientName: "",
    cpf: "",
    phone: "",
    email: "",
    productType: "Automóvel",
    cardValue: "",
    installments: "80",
    installmentValue: "",
    adminFee: "20",
    commissionPercent: "4",
    commissionValue: "",
    saleDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const loadLeads = useCallback(async () => {
    try {
      const r = await apiGet<{ leads?: Lead[] }>("/leads.php");
      setLeadList(r.leads ?? []);
    } catch {
      setLeadList([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadLeads();
    }
  }, [open, loadLeads]);

  useEffect(() => {
    if (!open || !leadId) return;
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
  }, [open, leadId]);

  useEffect(() => {
    if (formData.cardValue && formData.commissionPercent) {
      const cardValue = parseFloat(formData.cardValue.replace(/\D/g, "")) || 0;
      const percent = parseFloat(formData.commissionPercent) || 0;
      const commission = (cardValue * percent) / 100;
      setFormData((prev) => ({
        ...prev,
        commissionValue: commission.toFixed(2),
      }));
    }
  }, [formData.cardValue, formData.commissionPercent]);

  useEffect(() => {
    if (formData.cardValue && formData.installments) {
      const cardValue = parseFloat(formData.cardValue.replace(/\D/g, "")) || 0;
      const installments = parseInt(formData.installments, 10) || 1;
      const adminFee = parseFloat(formData.adminFee) || 0;
      const totalWithFee = cardValue + (cardValue * adminFee) / 100;
      const installmentValue = totalWithFee / installments;
      setFormData((prev) => ({
        ...prev,
        installmentValue: installmentValue.toFixed(2),
      }));
    }
  }, [formData.cardValue, formData.installments, formData.adminFee]);

  const resetForm = () => {
    setFormData({
      clientName: "",
      cpf: "",
      phone: "",
      email: "",
      productType: "Automóvel",
      cardValue: "",
      installments: "80",
      installmentValue: "",
      adminFee: "20",
      commissionPercent: "4",
      commissionValue: "",
      saleDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/\D/g, "")) || 0;
    return number.toLocaleString("pt-BR");
  };

  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData((prev) => ({
      ...prev,
      cardValue: value,
    }));
  };

  const handleSelectLead = (lid: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.cpf || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const cardNum = parseFloat(formData.cardValue.replace(/\D/g, "")) || 0;
    if (!cardNum) {
      toast.error("Informe um valor válido para a carta de crédito");
      return;
    }

    try {
      await apiPost("/sales.php", {
        clientName: formData.clientName,
        cpf: formData.cpf,
        phone: formData.phone,
        email: formData.email,
        productType: formData.productType,
        cardValue: cardNum,
        commissionPercent: parseFloat(formData.commissionPercent) || 4,
        saleDate: formData.saleDate,
        notes: formData.notes,
        installments: parseInt(formData.installments, 10) || 80,
        adminFee: parseFloat(formData.adminFee) || 20,
        installmentValue: formData.installmentValue
          ? parseFloat(formData.installmentValue)
          : undefined,
        leadId: leadId ? parseInt(leadId, 10) : undefined,
      });
      toast.success("Venda cadastrada com sucesso! 🎉", {
        description: `Cliente: ${formData.clientName} | Valor: R$ ${formatCurrency(formData.cardValue)}`,
      });
      onOpenChange(false);
      resetForm();
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar venda");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nova Venda de Consórcio</DialogTitle>
          <DialogDescription>
            Preencha os dados do contrato e do cliente para registrar a venda
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 mt-4">
          {!leadId && (
            <Card className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <Label className="text-sm font-medium mb-2 block">
                Converter Lead em Venda (Opcional)
              </Label>
              <Select onValueChange={handleSelectLead}>
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

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                👤
              </div>
              Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Nome Completo *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                  placeholder="Nome do cliente"
                  className="rounded-xl mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF/CNPJ *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cpf: e.target.value }))
                  }
                  placeholder="000.000.000-00"
                  className="rounded-xl mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="(11) 98765-4321"
                  className="rounded-xl mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="cliente@email.com"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                📋
              </div>
              Dados do Consórcio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productType">Tipo de Consórcio *</Label>
                <Select
                  value={formData.productType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, productType: value }))
                  }
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
                <Label htmlFor="cardValue">Valor da Carta de Crédito *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="cardValue"
                    value={formatCurrency(formData.cardValue)}
                    onChange={handleCurrencyInput}
                    placeholder="0,00"
                    className="rounded-xl pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="installments">Número de Parcelas *</Label>
                <Select
                  value={formData.installments}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, installments: value }))
                  }
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
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, adminFee: e.target.value }))
                  }
                  placeholder="20"
                  className="rounded-xl mt-1"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="installmentValue">Valor da Parcela (Calculado)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="installmentValue"
                    value={
                      formData.installmentValue
                        ? parseFloat(formData.installmentValue).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })
                        : "0,00"
                    }
                    readOnly
                    className="rounded-xl pl-10 bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="saleDate">Data da Venda</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, saleDate: e.target.value }))
                  }
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          </div>

          <Card className="p-6 rounded-3xl bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
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
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
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
                    className="rounded-xl pl-10 bg-green-50 border-green-300 font-bold text-green-700 text-lg"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Informações adicionais sobre a venda..."
              className="rounded-xl mt-1 min-h-[100px]"
            />
          </div>

          <Card className="p-6 rounded-3xl bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <h3 className="text-lg font-semibold mb-4">Resumo da Venda</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{formData.clientName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor da Carta</p>
                <p className="font-semibold text-purple-600">
                  R$ {formatCurrency(formData.cardValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parcelas</p>
                <p className="font-semibold">{formData.installments}x</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sua Comissão</p>
                <p className="font-semibold text-green-600">
                  R${" "}
                  {formData.commissionValue
                    ? parseFloat(formData.commissionValue).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })
                    : "0,00"}
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/30 rounded-xl px-8"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Cadastrar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
