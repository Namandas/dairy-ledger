// types/index.ts
export type Customer = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  unit: string;
  base_price: number;
};

export type ProductWithRate = Product & {
  effective_rate: number;
  is_special: boolean;
};

export type CartItem = {
  product_id: number;
  qty: number;
  rate: number;
  total: number;
};
