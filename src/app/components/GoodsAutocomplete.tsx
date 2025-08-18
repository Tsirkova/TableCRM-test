"use client";

import { useCallback, useRef, useState } from "react";
import { AutoComplete, Button, Space, Spin } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { api, NomenclatureLite } from "../api";

type Props = {
  token: string;
  onPick: (n: NomenclatureLite) => void; // добавляем выбранный товар
};

export default function GoodsAutocomplete({ token, onPick }: Props) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<DefaultOptionType[]>([]);
  const [loading, setLoading] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((value: string) => {
    if (!token) return;
    if (value.trim().length < 2) {
      setOpts([]);
      return;
    }
    setLoading(true);
    api.searchNomenclature(token, value.trim())
      .then(list => {
        const mapped: NomenclatureLite[] = list
          .map((x: any) => ({
            key: x.id ?? x.key ?? x.nomenclature_id,
            name: x.name ?? x.title ?? x.caption,
            unit_name: x.unit_name,
            price: x.price ?? x.default_price,
          }))
          .filter((x: any) => x.key && x.name);
        setOpts(
          mapped.slice(0, 20).map(it => ({
            value: String(it.key),             // значение в Select
            label: it.name,                    // как показывать в выпадающем списке
            item: it as any,                   // прокидываем весь объект, чтобы забрать в onSelect
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const onSearch = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(value), 300); // debounce 300ms
  };

  return (
    <Space.Compact style={{ width: "100%" }}>
      <AutoComplete
        style={{ width: "100%" }}
        value={q}
        options={opts}
        onSearch={onSearch}
        onChange={setQ}
        notFoundContent={loading ? <Spin size="small" /> : null}
        placeholder="Начните вводить название товара"
        onSelect={(_, option) => {
          const item = (option as any).item as NomenclatureLite;
          if (item) onPick(item);
          setQ("");
          setOpts([]);
        }}
        filterOption={false} // фильтруем на сервере
        showSearch
      />
    </Space.Compact>
  );
}
