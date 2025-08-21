// ./src/app/components/SaleForm.tsx
"use client";

import GoodsPicker from "./GoodsPicker";
import GoodsAutocomplete from "./GoodsAutocomplete";
import OrderLinesTable, { Line } from "./Table";

import { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, Select, Space, Button, Typography, Divider, message } from "antd";
import axios from "axios";
import {
  api, Id, API_BASE,
  Paybox, Organization, Warehouse, PriceType, Contragent,
  NomenclatureLite
} from "../api";

const { Title, Text } = Typography;

interface CreateSaleResponse {
  id?: number;
  [key: string]: unknown;
}

export default function SaleForm() {
  const [form] = Form.useForm();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [payboxes, setPayboxes] = useState<Paybox[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [contragents, setContragents] = useState<Contragent[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState<Id | 0>(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [formKey, setFormKey] = useState(0);

  // ───────── helpers ─────────

  // Полная очистка всего (форма + локальные стейты) — вызывается после УСПЕШНОГО POST
  const clearAll = () => {
    try {
      form.resetFields();
      form.setFieldsValue({
        phone: undefined,
        contragent: undefined,
        loyality_card_id: undefined,
        paybox: undefined,
        organization: undefined,
        warehouse: undefined,
        price_type: undefined,
        paid_rubles: undefined,
      });
    } catch {
      /* ignore */
    }

    setLines([]);
    setWarehouseId(0);
    setContragents([]);
    setPickerOpen(false);
    setToken("");

    // форс-ремонт формы и внутренних контролов
    setFormKey(k => k + 1);
  };

  // если позиция уже в корзине — просто +1
  const incrementIfExists = (nId: Id): boolean => {
    let changed = false;
    setLines(prev => {
      const exist = prev.find(l => l.nomenclature === nId);
      if (!exist) return prev;
      changed = true;
      return prev.map(l =>
        l.nomenclature === nId ? { ...l, quantity: l.quantity + 1 } : l
      );
    });
    return changed;
  };

  // Получить цену. Если price_type выбран — /alt_prices/{id}/?price_type_id=...
  // Если НЕ выбран — /alt_prices/{id}/ без price_type_id: берём price_type из ответа и ставим в форму
  const resolvePriceAndMaybeSetType = async (nomId: Id): Promise<number> => {
    if (!token) return 0;
    const inWh = warehouseId || 0;
    const selectedPriceTypeId = form.getFieldValue("price_type") as Id | undefined;

    try {
      if (selectedPriceTypeId) {
        const row = await api.altPriceByNomId(token, nomId, {
          price_type_id: selectedPriceTypeId,
          in_warehouse: inWh,
        });
        return Number(row?.price ?? 0);
      }

      // нет выбранного типа — тянем любую цену товара и тип из ответа
      const { data } = await axios.get(`${API_BASE}/alt_prices/${nomId}/`, {
        params: { token, in_warehouse: inWh, _ts: Date.now() },
      });

      // Ответ может быть объектом или массивом — нормализуем к одному объекту
      const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | undefined);
      if (!row) return 0;

      const price = Number((row.price as number | undefined) ?? 0);
      const priceTypeName = row.price_type as string | undefined;

      if (priceTypeName && !form.getFieldValue("price_type")) {
        const pt = priceTypes.find(p => p.name === priceTypeName);
        if (pt) form.setFieldsValue({ price_type: pt.id });
      }
      return price;
    } catch {
      return 0;
    }
  };

  // добавить строку
  const addLineResolved = async (n: NomenclatureLite) => {
    // если позиция уже есть — +1
    if (incrementIfExists(n.key)) return;

    const price = await resolvePriceAndMaybeSetType(n.key);

    setLines(prev => ([
      ...prev,
      {
        nomenclature: n.key,
        name: n.name,
        price,
        quantity: 1,
        unit: 116,
        unit_name: n.unit_name,
        discount: 0,
        sum_discounted: 0,
      }
    ]));
  };

  // ───────── загрузка справочников ─────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const aborts: AbortController[] = [];
    const make = () => {
      const c = new AbortController();
      aborts.push(c);
      return { signal: c.signal as AbortSignal };
    };

    (async () => {
      try {
        const [p, o, w, pt, ca] = await Promise.all([
          api.payboxes(token, { name: "" }, make()),
          api.organizations(token, { name: "" }, make()),
          api.warehouses(token, { name: "" }, make()),
          api.priceTypes(token, make()),
          api.contragents(token, make()),
        ]);
        setPayboxes(p);
        setOrgs(o);
        setWhs(w);
        setPriceTypes(pt);
        setContragents(ca);
        message.success("Справочники загружены");
      } catch (err) {
        if (!axios.isCancel(err)) {
          message.error("Не удалось загрузить справочники");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => aborts.forEach(a => a.abort());
  }, [token]);

  // поиск контрагента по телефону
  const searchByPhone = async () => {
    const phone = form.getFieldValue("phone") as string | undefined;
    if (!token || !phone) return message.warning("Введите токен и телефон");
    try {
      const list = await api.contragentsByPhone(token, phone);
      setContragents(list);
      if (list.length) {
        form.setFieldsValue({ contragent: list[0].id });
        message.success(`Найдено: ${list.length}`);
      } else {
        message.info("Ничего не найдено");
      }
    } catch {
      message.error("Ошибка поиска");
    }
  };

  // итоги
  const total = useMemo(
    () => lines.reduce((s, l) => s + (l.price - l.discount) * l.quantity - l.sum_discounted, 0),
    [lines]
  );

  // ───────── отправка (создать / создать и провести) ─────────
  const submit = async (conduct: boolean) => {
    if (!token) return message.warning("Вставьте токен");
    if (!lines.length) return message.warning("Добавьте хотя бы одну позицию");

    const badPrices = lines.filter(l => (l.price ?? 0) <= 0);
    const badQty = lines.filter(l => (l.quantity ?? 0) <= 0);
    if (badPrices.length) {
      message.error(`Цена должна быть > 0 у: ${badPrices.map(x => `"${x.name}"`).join(", ")}`);
      return;
    }
    if (badQty.length) {
      message.error(`Количество должно быть > 0 у: ${badQty.map(x => `"${x.name}"`).join(", ")}`);
      return;
    }

    try {
      const values = await form.validateFields([
        "paybox",
        "organization",
        "warehouse",
        "contragent",
        "paid_rubles",
        "loyality_card_id",
      ]);

      const goods = lines.map(l => ({
        price: Number(l.price ?? 0),
        quantity: Number(l.quantity ?? 0),
        unit: Number(l.unit ?? 116),
        discount: Number(l.discount ?? 0),
        sum_discounted: Number(l.sum_discounted ?? 0),
        nomenclature: l.nomenclature,
      }));

      const dated = Math.floor(Date.now() / 1000);

      const paidRub = Number(values.paid_rubles ?? 0);
      const paidLt = 0; // поля paid_lt на форме нет — считаем 0
      const paid_rubles = conduct && paidRub === 0 && paidLt === 0
        ? Number(total.toFixed(2))
        : paidRub;

      const payloadOne = {
        dated,
        operation: "Заказ" as const,
        tax_included: true,
        tax_active: true,
        goods,
        settings: { date_next_created: null },
        loyality_card_id: values.loyality_card_id ? Number(values.loyality_card_id) : undefined,
        warehouse: values.warehouse as Id,
        contragent: (values.contragent as Id | null) ?? null,
        paybox: values.paybox as Id,
        organization: values.organization as Id,
        status: conduct, // false=создать, true=создать и провести
        paid_rubles,
        paid_lt: paidLt,
      };

      setLoading(true);
      const res: CreateSaleResponse | undefined = await api.createSale(token, [payloadOne]);

      if (res?.id) {
        message.success(conduct
          ? `Документ создан и проведён (ID: ${res.id})`
          : `Документ создан (ID: ${res.id})`
        );
      } else {
        message.success(conduct
          ? "Документ создан и проведён"
          : "Документ создан"
        );
      }

      // ЖЁСТКАЯ очистка формы и стейтов
      clearAll();

    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? "";
        const respData = err.response?.data;
        message.error(`Ошибка ${status}: ${JSON.stringify(respData)}`);
      } else {
        message.error("Ошибка создания (валидация формы)");
      }
    } finally {
      setLoading(false);
    }
  };

  const onCreate = () => submit(false);
  const onCreateAndPost = () => submit(true);

  return (
    <Card
      title="Проведение документа продажи"
      loading={loading}
      style={{ maxWidth: 800, margin: "16px auto", borderRadius: 12 }}
    >
      <Form
        key={formKey}
        form={form}
        layout="vertical"
      >
        {/* Auth */}
        <Form.Item label="Токен" required preserve={false}>
          <Input
            placeholder="Вставьте токен"
            value={token}
            onChange={e => setToken(e.target.value.trim())}
          />
        </Form.Item>

        <Divider />

        {/* Client */}
        <Title level={5}>Клиент</Title>
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item name="phone" style={{ flex: 1, marginBottom: 0 }} preserve={false}>
            <Input placeholder="+7 (000) 000-00-00" />
          </Form.Item>
          <Button onClick={searchByPhone} disabled={!token}>Найти</Button>
        </Space.Compact>
        <Form.Item name="contragent" label="Контрагент" preserve={false}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={contragents.length ? "Выберите" : "Нет данных"}
            options={contragents.map(c => ({ value: c.id, label: c.name }))}
            onChange={(id: number) => {
              const c = contragents.find(x => x.id === id);
              if (c?.phone) {
                form.setFieldsValue({ phone: c.phone });
              }
            }}
          />
        </Form.Item>

        <Divider />

        {/* Requisites */}
        <Title level={5}>Реквизиты</Title>
        <Form.Item name="paybox" label="Счёт" rules={[{ required: true }]} preserve={false}>
          <Select options={payboxes.map(p => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Form.Item name="organization" label="Организация" rules={[{ required: true }]} preserve={false}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Выберите организацию"
            options={orgs.map(o => ({ value: o.id, label: o.short_name }))}
          />
        </Form.Item>
        <Form.Item name="warehouse" label="Склад" rules={[{ required: true }]} preserve={false}>
          <Select
            options={whs.map(w => ({ value: w.id, label: w.name }))}
            onChange={(v: Id) => setWarehouseId(v)}
          />
        </Form.Item>
        <Form.Item name="price_type" label="Тип цены" preserve={false}>
          <Select
            allowClear
            options={priceTypes.map(pt => ({ value: pt.id, label: pt.name }))}
          />
        </Form.Item>

        <Divider />

        {/* Goods */}
        <Title level={5}>Товары</Title>

        <div style={{ display: "flex", width: "100%", gap: 8, alignItems: "center" }}>
          <Button
            type="primary"
            onClick={() => setPickerOpen(true)}
            style={{ flexShrink: 0 }}
            disabled={!token}
          >
            Выбрать
          </Button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* подставляем цену через alt_prices по id выбранного товара */}
            <GoodsAutocomplete token={token} onPick={addLineResolved} />
          </div>
        </div>

        {/* Lines table */}
        <OrderLinesTable lines={lines} setLines={setLines} />

        <Text strong style={{ display: "block", marginTop: 8 }}>
          Итого: {total.toFixed(2)} ₽
        </Text>

        <Divider />

        {/* Оплата */}
        <Title level={5}>Оплата</Title>
        <Form.Item name="paid_rubles" label="Оплачено, ₽" preserve={false}>
          <Input type="number" min={0} step="0.01" placeholder="0.00" />
        </Form.Item>

        {/* Actions */}
        <Space style={{ justifyContent: "flex-end", width: "100%", marginTop: 12 }}>
          <Button onClick={onCreate} loading={loading} disabled={!token}>
            Создать
          </Button>
          <Button type="primary" onClick={onCreateAndPost} loading={loading} disabled={!token}>
            Создать и провести
          </Button>
        </Space>
      </Form>

      {/* Каталог с деревом категорий */}
      <GoodsPicker
        token={token}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        warehouseId={warehouseId}
        onPick={async (nom) => {
          await addLineResolved({
            key: nom.id,
            name: nom.name,
            unit_name: nom.unit_name,
          });
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}
