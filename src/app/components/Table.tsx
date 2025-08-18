"use client";

import React from "react";
import { Table, InputNumber, Button, Typography, Grid, List, Card, Space, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Id } from "../api";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export type Line = {
  nomenclature: Id;
  name: string;
  price: number;
  quantity: number;
  unit: number;
  unit_name?: string;
  discount: number;
  sum_discounted: number;
};

interface Props {
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
}

export default function OrderLinesTable({ lines, setLines }: Props) {
  const screens = useBreakpoint();
  const isMobile = !screens.sm; // xs

  const onChangeLine =
    <K extends keyof Line>(idx: number, key: K) =>
    (val: number | null) => {
      setLines((prev) =>
        prev.map((x, i) =>
          i === idx ? { ...x, [key]: Number(val ?? (key === "quantity" ? 1 : 0)) } : x
        )
      );
    };

  const calcSum = (row: Line) => ((row.price - row.discount) * row.quantity - row.sum_discounted);

  const columns: ColumnsType<Line> = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Цена",
      dataIndex: "price",
      key: "price",
      responsive: ["sm"],
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          size="small"
          value={value}
          min={0}
          style={{ width: 120 }}
          onChange={onChangeLine(idx, "price")}
        />
      ),
    },
    {
      title: "Скидка",
      dataIndex: "discount",
      key: "discount",
      responsive: ["sm"],
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          size="small"
          value={value}
          min={0}
          style={{ width: 120 }}
          onChange={onChangeLine(idx, "discount")}
        />
      ),
    },
    {
      title: "Количество",
      dataIndex: "quantity",
      key: "quantity",
      responsive: ["sm"],
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          size="small"
          value={value}
          min={1}
          style={{ width: 120 }}
          onChange={onChangeLine(idx, "quantity")}
        />
      ),
    },
    {
      title: "Единица",
      dataIndex: "unit_name",
      key: "unit_name",
      responsive: ["md"],
      ellipsis: true,
    },
    {
      title: "Итого",
      key: "sum",
      render: (_: unknown, row: Line) => (
        <Text strong>{calcSum(row).toFixed(2)}</Text>
      ),
    },
    {
      title: "Действие",
      key: "action",
      render: (_: unknown, _row: Line, idx: number) => (
        <Button
          size="small"
          danger
          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
        >
          Удалить
        </Button>
      ),
    },
  ];

  if (isMobile) {
    // Мобильный вид: карточки со встроенными инпутами
    return (
      <List
        style={{ marginTop: 12 }}
        dataSource={lines}
        renderItem={(item, idx) => (
          <List.Item style={{ padding: 0, marginBottom: 12 }}>
            <Card
              size="small"
              title={<Text strong ellipsis>{item.name}</Text>}
              styles={{ body: { paddingTop: 12 } }}
              extra={
                <Button danger size="small" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                  Удалить
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }} size="small">
                <div>
                  <Text type="secondary">Цена</Text>
                  <InputNumber
                    value={item.price}
                    min={0}
                    style={{ width: "100%" }}
                    onChange={onChangeLine(idx, "price")}
                  />
                </div>

                <div>
                  <Text type="secondary">Скидка</Text>
                  <InputNumber
                    value={item.discount}
                    min={0}
                    style={{ width: "100%" }}
                    onChange={onChangeLine(idx, "discount")}
                  />
                </div>

                <div>
                  <Text type="secondary">Количество</Text>
                  <InputNumber
                    value={item.quantity}
                    min={1}
                    style={{ width: "100%" }}
                    onChange={onChangeLine(idx, "quantity")}
                  />
                </div>

                {item.unit_name ? (
                  <div>
                    <Text type="secondary">Единица</Text>
                    <div><Text>{item.unit_name}</Text></div>
                  </div>
                ) : null}

                <Divider style={{ margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">Итого</Text>
                  <Text strong>{calcSum(item).toFixed(2)}</Text>
                </div>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    );
  }

  // Десктоп/планшет: таблица с горизонтальным скроллом на узких экранах
  return (
    <Table<Line>
      style={{ marginTop: 12 }}
      dataSource={lines.map((l) => ({ ...l, key: String(l.nomenclature) }))}
      columns={columns}
      pagination={false}
      bordered
      size="small"
      scroll={{ x: 760 }}
    />
  );
}
