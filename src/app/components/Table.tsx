"use client";

import { Table, InputNumber, Button, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Id } from "../api";

const { Text } = Typography;

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
  const columns: ColumnsType<Line> = [
    {
      title: "Название товара",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Цена",
      dataIndex: "price",
      key: "price",
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          value={value}
          min={0}
          onChange={(val) =>
            setLines((prev) =>
              prev.map((x, i) => (i === idx ? { ...x, price: Number(val || 0) } : x))
            )
          }
        />
      ),
    },
    {
      title: "Скидка",
      dataIndex: "discount",
      key: "discount",
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          value={value}
          min={0}
          onChange={(val) =>
            setLines((prev) =>
              prev.map((x, i) => (i === idx ? { ...x, discount: Number(val || 0) } : x))
            )
          }
        />
      ),
    },
    {
      title: "Количество",
      dataIndex: "quantity",
      key: "quantity",
      render: (value: number, _row: Line, idx: number) => (
        <InputNumber
          value={value}
          min={1}
          onChange={(val) =>
            setLines((prev) =>
              prev.map((x, i) => (i === idx ? { ...x, quantity: Number(val || 1) } : x))
            )
          }
        />
      ),
    },
    {
      title: "Единица",
      dataIndex: "unit_name",
      key: "unit_name",
    },
    {
      title: "Итого",
      key: "sum",
      render: (_: unknown, row: Line) => (
        <Text strong>
          {((row.price - row.discount) * row.quantity - row.sum_discounted).toFixed(2)}
        </Text>
      ),
    },
    {
      title: "Действие",
      key: "action",
      render: (_: unknown, _row: Line, idx: number) => (
        <Button danger onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <Table<Line>
      style={{ marginTop: 12 }}
      dataSource={lines.map((l) => ({ ...l, key: l.nomenclature }))}
      columns={columns}
      pagination={false}
      bordered
      size="small"
    />
  );
}
