// src/app/api.ts
import axios, { type AxiosRequestConfig } from "axios";

export const API_BASE = "https://app.tablecrm.com/api/v1";
export type Id = number;

export interface Paybox { id: Id; name: string }
export interface Organization { id: Id; short_name: string }
export interface Warehouse { id: Id; name: string }
export interface PriceType { id: Id; name: string }
export interface Contragent { id: Id; name: string; phone?: string | null }

export interface Category {
  key: number;
  name: string;
  nom_count: number;
  parent: number | null;
  children?: Category[];
}

export interface NomenclatureLite {
  key: Id;
  name: string;
  unit_name?: string;
  price?: number;
  balance?: number;
}

export interface NomenclatureRow {
  id: number;
  name: string;
  unit: number;
  unit_name: string;
  category: number;
  prices?: { price: number; price_type: string }[];
  balances?: { warehouse_name: string; current_amount: number }[];
  code?: string;
}

export interface NomenclatureDetail {
  id: number;
  name: string;
  unit: number;
  unit_name: string;
  category: number;
  code?: string;
}

export interface SaleLine {
  price: number;
  quantity: number;
  unit: number;
  discount: number;
  sum_discounted: number;
  nomenclature: Id;
}

export interface CreateSalePayload {
  dated: number; // unix timestamp (в секундах)
  operation: "Заказ";
  tax_included: boolean;
  tax_active: boolean;
  goods: SaleLine[];
  settings: { date_next_created: null };
  loyality_card_id?: number | null;
  warehouse: Id;
  contragent: Id | null;
  paybox: Id;
  organization: Id;
  status: boolean; // false — черновик, true — провести
  paid_rubles: number;
  paid_lt: number;
}

export interface AltPriceParams {
  price_type_id: Id;
  category?: Id;
  in_warehouse?: Id | 0;
  limit?: number;
  with_prices?: boolean;
  with_balance?: boolean;
}

export interface AltPriceRowRaw {
  id: Id;
  nomenclature_id: Id;
  nomenclature_name: string;
  unit: number;
  unit_name: string;
  price: number;
  price_type: string;
  date_from: number | null;
  date_to: number | null;
  updated_at: number;
  created_at: number;
}

// ───────── helpers ─────────
type ListResponse<T> = T[] | { result?: T[]; results?: T[]; count?: number };

function propArray<T>(obj: unknown, key: "result" | "results" | "data"): T[] {
  if (obj && typeof obj === "object") {
    const v = (obj as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function toArray<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const r = propArray<T>(data, "result");
  if (r.length) return r;
  const rs = propArray<T>(data, "results");
  if (rs.length) return rs;
  const d = propArray<T>(data, "data");
  if (d.length) return d;

  if (data && typeof data === "object") {
    const vals = Object.values(data as Record<string, unknown>);
    if (Array.isArray(vals) && vals.every(v => typeof v === "object")) {
      return vals as unknown as T[];
    }
  }
  return [];
}

async function getJSON<T>(url: string, cfg?: AxiosRequestConfig): Promise<T> {
  const { data } = await axios.get<T>(url, cfg);
  return data;
}

// ───────── API ─────────
export const api = {
  async payboxes(token: string, params?: { name?: string; limit?: number; offset?: number }, cfg?: AxiosRequestConfig): Promise<Paybox[]> {
    const data = await getJSON<ListResponse<Paybox>>(`${API_BASE}/payboxes/`, {
      params: { token, ...(params ?? {}) },
      ...(cfg ?? {}),
    });
    return toArray<Paybox>(data);
  },

  async organizations(token: string, params?: { name?: string; limit?: number; offset?: number }, cfg?: AxiosRequestConfig): Promise<Organization[]> {
    const data = await getJSON<ListResponse<Organization>>(`${API_BASE}/organizations/`, {
      params: { token, ...(params ?? {}) },
      ...(cfg ?? {}),
    });
    return toArray<Organization>(data);
  },

  async warehouses(token: string, params?: { name?: string; limit?: number; offset?: number }, cfg?: AxiosRequestConfig): Promise<Warehouse[]> {
    const data = await getJSON<ListResponse<Warehouse>>(`${API_BASE}/warehouses/`, {
      params: { token, ...(params ?? {}) },
      ...(cfg ?? {}),
    });
    return toArray<Warehouse>(data);
  },

  async priceTypes(token: string, cfg?: AxiosRequestConfig): Promise<PriceType[]> {
    const data = await getJSON<ListResponse<PriceType>>(`${API_BASE}/price_types/`, {
      params: { token },
      ...(cfg ?? {}),
    });
    return toArray<PriceType>(data);
  },

  async contragents(token: string, cfg?: AxiosRequestConfig): Promise<Contragent[]> {
    const data = await getJSON<ListResponse<Contragent>>(`${API_BASE}/contragents/`, {
      params: { token },
      ...(cfg ?? {}),
    });
    return toArray<Contragent>(data);
  },

  async contragentsByPhone(token: string, phone: string, cfg?: AxiosRequestConfig): Promise<Contragent[]> {
    const data = await getJSON<ListResponse<Contragent>>(`${API_BASE}/contragents/`, {
      params: { token, phone, add_tags: true, _ts: Date.now() },
      ...(cfg ?? {}),
    });
    return toArray<Contragent>(data);
  },

  async searchNomenclature(token: string, name = "", cfg?: AxiosRequestConfig): Promise<unknown[]> {
    const data = await getJSON<unknown>(`${API_BASE}/nomenclature/`, {
      params: { token, name, _ts: Date.now() },
      ...(cfg ?? {}),
    });
    return toArray<unknown>(data);
  },

  async categoriesTree(token: string, cfg?: AxiosRequestConfig): Promise<Category[]> {
    const data = await getJSON<{ result?: Category[] } | Category[]>(`${API_BASE}/categories_tree/`, {
      params: { token, _ts: Date.now() },
      ...(cfg ?? {}),
    });
    return toArray<Category>(data);
  },

  async nomenclatureByCategory(
    token: string,
    p: { category: number; with_prices?: boolean; with_balance?: boolean; in_warehouse?: number | 0; limit?: number },
    cfg?: AxiosRequestConfig
  ): Promise<NomenclatureRow[]> {
    const data = await getJSON<{ result?: NomenclatureRow[] } | NomenclatureRow[]>(`${API_BASE}/nomenclature/`, {
      params: {
        token,
        category: p.category,
        with_prices: p.with_prices ?? true,
        with_balance: p.with_balance ?? true,
        in_warehouse: p.in_warehouse ?? 0,
        limit: p.limit ?? 100000,
        _ts: Date.now(),
      },
      ...(cfg ?? {}),
    });
    return toArray<NomenclatureRow>(data);
  },

  async nomenclatureById(token: string, id: number, cfg?: AxiosRequestConfig): Promise<NomenclatureDetail> {
    const data = await getJSON<NomenclatureDetail>(`${API_BASE}/nomenclature/${id}/`, {
      params: { token, _ts: Date.now() },
      ...(cfg ?? {}),
    });
    return data;
  },

  // Список альтернативных цен (оставляем на всякий случай)
  async altPrices(
    token: string,
    tableId: Id, // может быть ID товара или таблицы — зависит от API-конфигурации
    params: AltPriceParams,
    cfg?: AxiosRequestConfig
  ): Promise<NomenclatureLite[]> {
    const data = await getJSON<unknown>(`${API_BASE}/alt_prices/${tableId}/`, {
      params: {
        token,
        price_type_id: params.price_type_id,
        ...(params.category != null ? { category: params.category } : {}),
        with_prices: params.with_prices ?? true,
        with_balance: params.with_balance ?? true,
        in_warehouse: params.in_warehouse ?? 0,
        limit: params.limit ?? 100000,
        _ts: Date.now(),
      },
      ...(cfg ?? {}),
    });
    const list = toArray<{
      id: Id;
      nomenclature_id?: Id;
      nomenclature_name?: string;
      name?: string;
      unit_name?: string;
      price?: number;
    }>(data);
    return list.map(x => ({
      key: (x.nomenclature_id ?? x.id) as Id,
      name: x.nomenclature_name ?? x.name ?? "",
      unit_name: x.unit_name,
      price: x.price,
    }));
  },

  // Точечная цена по номенклатуре и виду цены
  async altPriceByNomId(
    token: string,
    nomId: Id,
    params: { price_type_id: Id; in_warehouse?: Id | 0 },
    cfg?: AxiosRequestConfig
  ): Promise<AltPriceRowRaw> {
    const data = await getJSON<AltPriceRowRaw>(`${API_BASE}/alt_prices/${nomId}/`, {
      params: {
        token,
        price_type_id: params.price_type_id,
        in_warehouse: params.in_warehouse ?? 0,
        _ts: Date.now(),
      },
      ...(cfg ?? {}),
    });
    return data;
  },

  // create sale — принимает объект ИЛИ массив, отправляет МАССИВ
  async createSale(
    token: string,
    payload: CreateSalePayload | CreateSalePayload[],
    cfg?: AxiosRequestConfig
  ): Promise<{ id?: Id } | undefined> {
    const body = Array.isArray(payload) ? payload : [payload];
    const { data } = await axios.post<{ id?: Id }>(`${API_BASE}/docs_sales/`, body, {
      params: { token },
      headers: { "Content-Type": "application/json" },
      ...cfg,
    });
    return data;
  },

  async postDeliveryInfo(token: string, saleId: Id, body: Record<string, unknown>): Promise<void> {
    await axios.post(`${API_BASE}/docs_sales/${saleId}/delivery_info/`, body, {
      params: { token },
    });
  },
};
