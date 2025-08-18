// api.ts
import axios from "axios";
export const API_BASE = "https://app.tablecrm.com/api/v1";

export type Id = number;
type NomenSearchResponse = any[] | { results?: any[] };
type ReqOpts = { signal?: AbortSignal };

export interface Paybox { id: Id; name: string }
export interface Organization {
    short_name: any; id: Id; name: string 
}
export interface Warehouse { id: Id; name: string }
export interface PriceType { id: Id; name: string }
export interface Contragent { id: Id; name: string; phone?: string }
export interface CategoryNode { key: number; name: string; children?: CategoryNode[]; }
export interface NomenclatureLite { key: Id; name: string; unit_name?: string; price?: number; balance?: number }

export interface Contragent {
  id: Id;
  name: string;
  phone?: string;
  // добавляй поля по необходимости
}

export interface SaleLine {
  nomenclature: Id;     // ключ номенклатуры
  price: number;
  quantity: number;
  unit: number;         // id единицы измерения
  discount: number;
  sum_discounted: number;
}

export interface CreateSalePayload {
  operation: "Заказ";
  tax_included: boolean;
  tax_active: boolean;
  goods: SaleLine[];
  warehouse: Id;
  contragent: Id | null;
  paybox: Id;
  organization: Id;
  status: boolean;             
  paid_rubles: number;
  paid_lt: number;
  settings: { date_next_created: null };
}

export interface Category {
  key: number;
  name: string;
  nom_count: number;
  parent: number | null;
  children?: Category[];
}
export const categoriesTree = (token: string, opts: { signal?: AbortSignal } = {}) =>
  axios.get(`${API_BASE}/categories_tree/`, {
    params: { token, _ts: Date.now() },
    signal: opts.signal,
    headers: { "Cache-Control": "no-cache" },
  }).then(r => Array.isArray(r.data?.result) ? r.data.result as Category[] : []);

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

export const nomenclatureByCategory = (
  token: string,
  p: {
    category: number;
    with_prices?: boolean;
    with_balance?: boolean;
    in_warehouse?: number | 0;
    limit?: number;
  },
  opts: { signal?: AbortSignal } = {}
) => axios.get(`${API_BASE}/nomenclature/`, {
  params: {
    token,
    category: p.category,
    with_prices: p.with_prices ?? true,
    with_balance: p.with_balance ?? true,
    in_warehouse: p.in_warehouse ?? 0,
    limit: p.limit ?? 100000,
    _ts: Date.now(),
  },
  signal: opts.signal,
  headers: { "Cache-Control": "no-cache" },
}).then(r => Array.isArray(r.data?.result) ? r.data.result as NomenclatureRow[] : []);

export interface NomenclatureDetail {
  id: number;
  name: string;
  unit: number;
  unit_name: string;
  category: number;
  code?: string;
}
export const nomenclatureById = (token: string, id: number, opts: { signal?: AbortSignal } = {}) =>
  axios.get(`${API_BASE}/nomenclature/${id}/`, {
    params: { token, _ts: Date.now() },
    signal: opts.signal,
    headers: { "Cache-Control": "no-cache" },
  }).then(r => r.data as NomenclatureDetail);

function toArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.result)) return data.result as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (data && typeof data === "object") {
    const vals = Object.values(data);
    if (Array.isArray(vals) && vals.every(v => typeof v === "object")) return vals as T[];
  }
  return [];
}

export const api = {
  payboxes: (token: string, name = "", opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/payboxes/`, {
      params: { token, name },
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

    organizations: (token: string, params?: { name?: string; limit?: number; offset?: number }, opts?: { signal?: AbortSignal }) =>
    axios.get(`${API_BASE}/organizations/`, {
        params: {
        token,
        name: params?.name ?? "",
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        _ts: Date.now(),
        },
        signal: opts?.signal,
        headers: { "Cache-Control": "no-cache" },
    }).then(r => Array.isArray(r.data.result) ? r.data.result : [] as Organization[]),


  warehouses: (token: string, name = "", opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/warehouses/`, {
      params: { token, name },
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

  priceTypes: (token: string, opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/price_types/`, {
      params: { token },
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

    contragents: (token: string, opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/contragents/`, {
      params: { token },
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

  contragentsByPhone: (token: string, phone: string, opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/contragents/`, {
      params: { token, phone, add_tags: true, _ts: Date.now() }, // cache-buster
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

  searchNomenclature: (token: string, name = "", opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/nomenclature/`, {
      params: { token, name, _ts: Date.now() },
      signal: opts.signal,
      headers: { "Cache-Control": "no-cache" }
    }).then(r => toArray(r.data)),

  categoriesTree: (token: string, opts: ReqOpts = {}) =>
    axios.get(`${API_BASE}/categories_tree/?token=${token}`)
      .then(r => r.data as CategoryNode[]),

  altPrices: (token: string, tableId: Id, params: {
    price_type_id: Id; category: Id; in_warehouse?: Id | 0; limit?: number
    with_prices?: boolean; with_balance?: boolean;
  }) => {
    const {
      price_type_id, category,
      with_prices = true, with_balance = true, in_warehouse = 0, limit = 100000,
    } = params;
    const url = `${API_BASE}/alt_prices/${tableId}?token=${token}&price_type_id=${price_type_id}` +
      `&category=${category}&with_prices=${with_prices}&with_balance=${with_balance}` +
      `&in_warehouse=${in_warehouse}&limit=${limit}`;
    return axios.get(url).then(r => r.data as NomenclatureLite[]);
  },

};
