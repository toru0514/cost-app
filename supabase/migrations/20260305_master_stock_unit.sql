alter table material_stock
  add column if not exists stock_unit text;

alter table packaging_stock
  add column if not exists stock_unit text;
