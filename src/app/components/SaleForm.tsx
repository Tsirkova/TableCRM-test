"use client";

import GoodsPicker from "./GoodsPicker";
import GoodsAutocomplete from "./GoodsAutocomplete";
import OrderLinesTable, { Line } from "./Table";

import { useEffect, useMemo, useState } from "react";
import {
  Card, Form, Input, Select, Space, Button, InputNumber,
  Typography, Divider, message
} from "antd";
import {
  api, Id, Organization, Warehouse,
  Paybox, PriceType, Contragent,
  NomenclatureLite, CreateSalePayload
} from "../api";

const { Title, Text } = Typography;

export default function SaleForm() {
  const [form] = Form.useForm();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [payboxes, setPayboxes] = useState<Paybox[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [contragents, setContragents] = useState<Contragent[]>([]);
  const [goodsQuick, setGoodsQuick] = useState<NomenclatureLite[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);

  // alt_prices каталожные параметры
  const [priceTypeId, setPriceTypeId] = useState<Id | null>(null);
  const [warehouseId, setWarehouseId] = useState<Id | 0>(0);

  const [lines, setLines] = useState<Line[]>([]);

  // добавить строку
  const addLine = (n: NomenclatureLite) => {
    setLines(prev => {
      const exist = prev.find(l => l.nomenclature === n.key);
      if (exist) {
        return prev.map(l =>
          l.nomenclature === n.key ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          nomenclature: n.key,
          name: n.name,
          price: n.price ?? 0,
          quantity: 1,
          unit: 116,
          unit_name: n.unit_name,
          discount: 0,
          sum_discounted: 0,
        }
      ];
    });
  };

  // загрузка справочников
  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const aborts: AbortController[] = [];
    const make = () => { const c = new AbortController(); aborts.push(c); return { signal: c.signal }; };

    (async () => {
      try {
        const [p, o, w, pt, ca] = await Promise.all([
          api.payboxes(token, "", make()),
          api.organizations(token, { name: "" }, make()),
          api.warehouses(token, "", make()),
          api.priceTypes(token, make()),
          api.contragents(token, make()),
        ]);
        setPayboxes(p);
        setOrgs(o);
        setWhs(w);
        setPriceTypes(pt);
        setContragents(ca);
        message.success("Справочники загружены");
      } catch (e) {
        if ((e as any)?.name !== "CanceledError")
          message.error("Не удалось загрузить справочники");
      } finally {
        setLoading(false);
      }
    })();

    return () => aborts.forEach(a => a.abort());
  }, [token]);

  // поиск контрагента по телефону
  const searchByPhone = async () => {
    const phone = form.getFieldValue("phone");
    if (!token || !phone) return message.warning("Введите токен и телефон");
    try {
      const list = await api.contragentsByPhone(token, phone);
      setContragents(list);
      if (list.length) {
        form.setFieldsValue({ contragent: list[0].id });
        message.success(`Найдено: ${list.length}`);
      } else message.info("Ничего не найдено");
    } catch {
      message.error("Ошибка поиска");
    }
  };

  // быстрый поиск товаров по имени
  const searchGoods = async () => {
    const q = form.getFieldValue("goods_query") ?? "";
    if (!token) return message.warning("Введите токен");
    const list = await api.searchNomenclature(token, q);
    const mapped: NomenclatureLite[] = list.map((x: any) => ({
      key: x.id ?? x.key ?? x.nomenclature_id,
      name: x.name ?? x.title ?? x.caption,
      unit_name: x.unit_name,
      price: x.price ?? x.default_price,
    })).filter((x: any) => x.key && x.name);
    setGoodsQuick(mapped);
  };

  // итоги
  const total = useMemo(() =>
    lines.reduce((s, l) => s + (l.price - l.discount) * l.quantity - l.sum_discounted, 0),
    [lines]
  );

  return (
    <Card
      title="Проведение документа продажи"
      loading={loading}
      style={{ maxWidth: 800, margin: "16px auto", borderRadius: 12 }}
    >
      <Form form={form} layout="vertical" initialValues={{ paid_rubles: 0, paid_lt: 0 }}>
        {/* Auth */}
        <Form.Item label="Токен" required>
          <Input placeholder="Вставьте токен" value={token} onChange={e => setToken(e.target.value.trim())} />
        </Form.Item>

        <Divider />

        {/* Client */}
        <Title level={5}>Клиент</Title>
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item name="phone" style={{ flex: 1, marginBottom: 0 }}>
            <Input placeholder="+7 (000) 000-00-00" />
          </Form.Item>
          <Button onClick={searchByPhone}>Найти по телефону</Button>
        </Space.Compact>
        <Form.Item name="contragent" label="Контрагент">
        <Select
            showSearch
            optionFilterProp="label"
            placeholder={contragents.length ? "Выберите" : "Нет данных"}
            options={contragents.map(c => ({ value: c.id, label: c.name }))}
            onChange={(id) => {
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
        <Form.Item name="paybox" label="Счёт" rules={[{ required: true }]}>
          <Select options={payboxes.map(p => ({ value: p.id, label: p.name }))} />
        </Form.Item>
        <Form.Item name="organization" label="Организация" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Выберите организацию"
            options={orgs.map(o => ({ value: o.id, label: o.short_name }))}
          />
        </Form.Item>
        <Form.Item name="warehouse" label="Склад" rules={[{ required: true }]}>
          <Select
            options={whs.map(w => ({ value: w.id, label: w.name }))}
            onChange={(v) => setWarehouseId(v)}
          />
        </Form.Item>
        <Form.Item name="price_type" label="Тип цены">
          <Select
            allowClear
            options={priceTypes.map(pt => ({ value: pt.id, label: pt.name }))}
            onChange={(v) => setPriceTypeId(v ?? null)}
          />
        </Form.Item>

        <Divider />

        {/* Goods */}
        <Title level={5}>Товары</Title>

        <Space.Compact style={{ width: "100%" }}>
            <Button type="primary" onClick={() => setPickerOpen(true)}>
                Выбрать
            </Button>
            <GoodsAutocomplete token={token} onPick={(n) => addLine(n)} />
        </Space.Compact>

        {/* Lines table */}
        <OrderLinesTable lines={lines} setLines={setLines} />

        <Text strong style={{ display: "block", marginTop: 8 }}>
          Итого: {total.toFixed(2)} ₽
        </Text>

        {/* Actions */}
        <Space style={{ justifyContent: "flex-end", width: "100%", marginTop: 12 }}>
          <Button>Создать</Button>
          <Button type="primary" >Создать и провести</Button>
        </Space>
      </Form>

      {/* Каталог с деревом категорий */}
      <GoodsPicker
        token={token}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        warehouseId={warehouseId}
        onPick={(nom) => {
          addLine({
            key: nom.id,
            name: nom.name,
            unit_name: nom.unit_name,
            price: 0,
          });
        }}
      />
    </Card>
  );
}