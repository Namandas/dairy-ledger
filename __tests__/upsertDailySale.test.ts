import * as queries from '../db/queries';

describe('upsertDailySale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates existing sale: deletes old items and inserts new ones and updates total', () => {
    const fakeSaleId = 42;
    jest.spyOn(queries, 'runQuery').mockImplementation((sql: string) => {
      if (sql.includes('FROM sales WHERE customer_id')) return [{ id: fakeSaleId }] as any;
      return [] as any;
    });

    const runBatchSpy = jest.spyOn(queries, 'runBatch').mockImplementation(() => {});

    const items = [ { product_id: 1, quantity: 2, price: 5 }, { product_id: 2, quantity: 1, price: 3 } ];
    queries.upsertDailySale(10, '2026-01-02', items);

    expect(runBatchSpy).toHaveBeenCalledTimes(1);
    const stmts = runBatchSpy.mock.calls[0][0];
    // first statements include BEGIN and DELETE
    expect(stmts.some((s: any) => s.sql.includes('DELETE FROM sale_items'))).toBe(true);
    // contains update sales
    expect(stmts.some((s: any) => s.sql.includes('UPDATE sales SET total'))).toBe(true);
  });

  it('creates new sale when none exists and inserts items', () => {
    jest.spyOn(queries, 'runQuery').mockImplementation(() => [] as any);
    const runBatchSpy = jest.spyOn(queries, 'runBatch').mockImplementation(() => {});

    const items = [ { product_id: 3, quantity: 4, price: 2 } ];
    queries.upsertDailySale(11, '2026-01-02', items);

    expect(runBatchSpy).toHaveBeenCalledTimes(1);
    const stmts = runBatchSpy.mock.calls[0][0];
    // should include an INSERT INTO sales
    expect(stmts.some((s: any) => s.sql.includes('INSERT INTO sales'))).toBe(true);
    // should include insert into sale_items referencing latest sale id
    expect(stmts.some((s: any) => s.sql.includes('INSERT INTO sale_items') && s.sql.includes('SELECT id FROM sales'))).toBe(true);
  });
});
