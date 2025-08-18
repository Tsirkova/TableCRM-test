"use client";

import React from "react";
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
  const onChangeLine =
    <K extends keyof Line>(idx: number, key: K) =>
    (val: number | null) => {
      setLines((prev) =>
        prev.map((x, i) =>
          i === idx ? { ...x, [key]: Number(val ?? (key === "quantity" ? 1 : 0)) } : x
        )
      );
    };

  const calcSum = (row: Line) =>
    (row.price - row.discount) * row.quantity - row.sum_discounted;

  // без responsive, чтобы колонки не скрывались на телефоне
  const columns: ColumnsType<Line> = [
    {
      title: "Название",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 220,
    },
    {
      title: "Цена",
      dataIndex: "price",
      key: "price",
      width: 140,
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
      width: 140,
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
      title: "Кол-во",
      dataIndex: "quantity",
      key: "quantity",
      width: 140,
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
      title: "Ед.",
      dataIndex: "unit_name",
      key: "unit_name",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Итого",
      key: "sum",
      width: 140,
      render: (_: unknown, row: Line) => <Text strong>{calcSum(row).toFixed(2)}</Text>,
    },
    {
      title: "Действие",
      key: "action",
      fixed: "right",
      width: 110,
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

  return (
    <Table<Line>
      style={{ marginTop: 12 }}
      dataSource={lines.map((l) => ({ ...l, key: String(l.nomenclature) }))}
      columns={columns}
      pagination={false}
      bordered
      size="small"
      scroll={{ x: 1010 }}
      sticky
      tableLayout="fixed"
    />
  );
}
