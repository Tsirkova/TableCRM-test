"use client";

import { useCallback, useRef, useState } from "react";
import { AutoComplete, Space, Spin } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { api, type NomenclatureLite } from "../api";

type Props = {
  token: string;
  onPick: (n: NomenclatureLite) => void;
};

type UnknownItem = Record<string, unknown>;
type OptionWithItem = DefaultOptionType & { item: NomenclatureLite };

export default function GoodsAutocomplete({ token, onPick }: Props) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<OptionWithItem[]>([]);
  const [loading, setLoading] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapUnknownToLite = (arr: UnknownItem[]): NomenclatureLite[] => {
    const mapped = arr
      .map<NomenclatureLite | null>((x) => {
        const key =
          (x["id"] as number | undefined) ??
          (x["key"] as number | undefined) ??
          (x["nomenclature_id"] as number | undefined);

        const name =
          (x["name"] as string | undefined) ??
          (x["title"] as string | undefined) ??
          (x["caption"] as string | undefined);

        if (!key || !name) return null;

        const unit_name = x["unit_name"] as string | undefined;
        const price =
          (x["price"] as number | undefined) ??
          (x["default_price"] as number | undefined);

        const obj: NomenclatureLite = { key, name, unit_name, price };
        return obj;
      })
      .filter((v): v is NomenclatureLite => v !== null);

    return mapped;
  };

  const load = useCallback(
    (value: string) => {
      if (!token) return;
      const term = value.trim();
      if (term.length < 2) {
        setOpts([]);
        return;
      }
      setLoading(true);
      api
        .searchNomenclature(token, term)
        .then((data) => {
          const items = Array.isArray(data) ? (data as UnknownItem[]) : [];
          const mapped = mapUnknownToLite(items);
          const next: OptionWithItem[] = mapped.slice(0, 20).map((it) => ({
            value: String(it.key),
            label: it.name,
            item: it,
          }));
          setOpts(next);
        })
        .finally(() => setLoading(false));
    },
    [token]
  );

  const onSearch = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(value), 300);
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
          const opt = option as OptionWithItem;
          if (opt.item) onPick(opt.item);
          setQ("");
          setOpts([]);
        }}
        filterOption={false}
        showSearch
      />
    </Space.Compact>
  );
}
