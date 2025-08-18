"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Tree, Table, Button, Space, Input } from "antd";
import type { DataNode } from "antd/es/tree";
import { api, type Category, type NomenclatureRow, type NomenclatureDetail } from "../api";

type Props = {
  token: string;
  open: boolean;
  onClose: () => void;
  onPick: (nom: NomenclatureDetail) => void;
  warehouseId?: number | 0;
};

export default function GoodsPicker({ token, open, onClose, onPick, warehouseId = 0 }: Props) {
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [rows, setRows] = useState<NomenclatureRow[]>([]);
  const [q, setQ] = useState("");

  // загрузка категорий
  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    api.categoriesTree(token)
      .then(setTree)
      .finally(() => setLoading(false));
  }, [open, token]);

  const catToNodes = (cats: Category[]): DataNode[] =>
    cats.map(c => ({
      key: c.key,
      title: `${c.name}${c.nom_count ? ` (${c.nom_count})` : ""}`,
      children: c.children?.length ? catToNodes(c.children) : undefined,
    }));

  const loadCat = async (catId: number) => {
    setSelectedCat(catId);
    setLoading(true);
    try {
      const list = await api.nomenclatureByCategory(token, {
        category: catId,
        with_prices: true,
        with_balance: true,
        in_warehouse: warehouseId || 0,
        limit: 100000,
      });
      setRows(list);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const ql = q.toLowerCase();
    return rows.filter(
      r =>
        r.name.toLowerCase().includes(ql) ||
        (r.code ?? "").toLowerCase().includes(ql)
    );
  }, [rows, q]);

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={1000} title="Выбор номенклатуры">
      <Space style={{ width: "100%", marginBottom: 8 }}>
        <Input
          placeholder="Поиск по названию/коду"
          value={q}
          onChange={e => setQ(e.target.value)}
          allowClear
        />
      </Space>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, minHeight: 480 }}>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 8, overflow: "auto" }}>
          <Tree
            treeData={catToNodes(tree)}
            selectedKeys={selectedCat ? [selectedCat] : []}
            onSelect={(keys) => {
              const id = Number(keys[0]);
              if (id) loadCat(id);
            }}
            defaultExpandAll
          />
        </div>
        <div>
          <Table<NomenclatureRow>
            rowKey="id"
            loading={loading}
            dataSource={filtered}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Наименование", dataIndex: "name" },
              {
                title: "Цены",
                render: (_: unknown, r) =>
                  (r.prices ?? []).map(p => `${p.price_type}: ${p.price}`).join(", "),
                ellipsis: true,
              },
              {
                title: "Остатки",
                render: (_: unknown, r) =>
                  (r.balances ?? [])
                    .slice(0, 3)
                    .map(b => `${b.warehouse_name}: ${b.current_amount}`)
                    .join(", "),
                ellipsis: true,
              },
              { title: "Единица", dataIndex: "unit_name", width: 120 },
              {
                title: "Действие",
                width: 120,
                render: (_: unknown, r) => (
                  <Button
                    type="link"
                    onClick={async () => {
                      const detail = await api.nomenclatureById(token, r.id);
                      onPick(detail);
                      onClose();
                    }}
                  >
                    Выбрать
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
