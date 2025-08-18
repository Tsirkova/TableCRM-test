"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Tree,
  Table,
  Button,
  Space,
  Input,
  Grid,
  Tabs,
  List,
  Card,
  Typography,
  Divider,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { api, type Category, type NomenclatureRow, type NomenclatureDetail } from "../api";

const { useBreakpoint } = Grid;
const { Text } = Typography;

type Props = {
  token: string;
  open: boolean;
  onClose: () => void;
  onPick: (nom: NomenclatureDetail) => void;
  warehouseId?: number | 0;
};

export default function GoodsPicker({ token, open, onClose, onPick, warehouseId = 0 }: Props) {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [rows, setRows] = useState<NomenclatureRow[]>([]);
  const [q, setQ] = useState("");

  // загрузка категорий
  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    api
      .categoriesTree(token)
      .then(setTree)
      .finally(() => setLoading(false));
  }, [open, token]);

  const catToNodes = (cats: Category[]): DataNode[] =>
    cats.map((c) => ({
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
      (r) => r.name.toLowerCase().includes(ql) || (r.code ?? "").toLowerCase().includes(ql)
    );
  }, [rows, q]);

  const PricesCell = ({ r }: { r: NomenclatureRow }) => (
    <Text ellipsis>
      {(r.prices ?? []).map((p) => `${p.price_type}: ${p.price}`).join(", ")}
    </Text>
  );

  const BalancesCell = ({ r }: { r: NomenclatureRow }) => (
    <Text ellipsis>
      {(r.balances ?? [])
        .slice(0, 3)
        .map((b) => `${b.warehouse_name}: ${b.current_amount}`)
        .join(", ")}
    </Text>
  );

  const handlePick = async (id: number) => {
    const detail = await api.nomenclatureById(token, id);
    onPick(detail);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={isMobile ? "100%" : 1000}
      style={isMobile ? { top: 0, padding: 0 } : undefined}
      bodyStyle={isMobile ? { padding: 12 } : undefined}
      title="Выбор номенклатуры"
    >
      <Space style={{ width: "100%", marginBottom: 8 }}>
        <Input
          placeholder="Поиск по названию/коду"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
        />
      </Space>

      {isMobile ? (
        // === Мобильный вид: вкладки + карточки ===
        <Tabs
          defaultActiveKey="goods"
          items={[
            {
              key: "categories",
              label: "Категории",
              children: (
                <div
                  style={{
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    padding: 8,
                    maxHeight: "40vh",
                    overflow: "auto",
                  }}
                >
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
              ),
            },
            {
              key: "goods",
              label: "Товары",
              children: (
                <List
                  loading={loading}
                  dataSource={filtered}
                  style={{ marginTop: 8, maxHeight: "60vh", overflow: "auto" }}
                  renderItem={(r) => (
                    <List.Item style={{ padding: 0, marginBottom: 12 }}>
                      <Card
                        size="small"
                        title={
                          <Space direction="vertical" size={0} style={{ width: "100%" }}>
                            <Text strong>{r.name}</Text>
                            {r.code ? <Text type="secondary">Код: {r.code}</Text> : null}
                          </Space>
                        }
                        extra={
                          <Button type="link" onClick={() => handlePick(r.id)}>
                            Выбрать
                          </Button>
                        }
                        styles={{ body: { paddingTop: 12 } }}
                      >
                        <Space direction="vertical" size="small" style={{ width: "100%" }}>
                          <div>
                            <Text type="secondary">Цены</Text>
                            <div>
                              <PricesCell r={r} />
                            </div>
                          </div>

                          <div>
                            <Text type="secondary">Остатки</Text>
                            <div>
                              <BalancesCell r={r} />
                            </div>
                          </div>

                          {r.unit_name ? (
                            <div>
                              <Text type="secondary">Единица</Text>
                              <div>
                                <Text>{r.unit_name}</Text>
                              </div>
                            </div>
                          ) : null}

                          <Divider style={{ margin: "8px 0" }} />
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button type="primary" onClick={() => handlePick(r.id)}>
                              Выбрать
                            </Button>
                          </div>
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      ) : (
        // === Десктоп/планшет: исходный макет ===
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 12,
            minHeight: 480,
          }}
        >
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
              pagination={{ pageSize: 10, size: "small" }}
              scroll={{ x: 800 }}
              columns={[
                { title: "Наименование", dataIndex: "name" },
                {
                  title: "Цены",
                  render: (_: unknown, r) => <PricesCell r={r} />,
                  ellipsis: true,
                },
                {
                  title: "Остатки",
                  render: (_: unknown, r) => <BalancesCell r={r} />,
                  ellipsis: true,
                },
                { title: "Единица", dataIndex: "unit_name", width: 120 },
                {
                  title: "Действие",
                  width: 120,
                  render: (_: unknown, r) => (
                    <Button type="link" onClick={() => handlePick(r.id)}>
                      Выбрать
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
