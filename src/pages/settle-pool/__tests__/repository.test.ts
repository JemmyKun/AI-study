import { SettleStatus } from '../../../types/settle-pool';
import { createSeedOrders } from '../mockData';
import { createMemoryRepository, matchesFilters, matchesKeyword } from '../repository';

/** 构造一个无延迟、数据量可控的 repository，避免单测受模拟延迟影响 */
function repo(seedCount = 5) {
  return createMemoryRepository({ seed: createSeedOrders(seedCount), latencyMs: 0 });
}

describe('createSeedOrders', () => {
  it('相同参数生成完全一致的数据（伪随机可复现）', () => {
    expect(createSeedOrders(10)).toEqual(createSeedOrders(10));
  });

  it('id 唯一', () => {
    const ids = createSeedOrders(20).map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('matchesFilters', () => {
  const order = createSeedOrders(1)[0];

  it('空条件与纯空白一律命中', () => {
    expect(matchesFilters(order, {})).toBe(true);
    expect(matchesFilters(order, { settleNo: undefined })).toBe(true);
    expect(matchesFilters(order, { settleNo: '   ' })).toBe(true);
  });

  it('大小写不敏感的子串匹配', () => {
    expect(matchesFilters(order, { currency: order.currency.toLowerCase() })).toBe(true);
    expect(matchesFilters(order, { currency: '不存在的币种' })).toBe(false);
  });

  it('多个条件之间是「与」关系', () => {
    expect(matchesFilters(order, { currency: order.currency, status: '不存在的状态' })).toBe(false);
  });
});

describe('matchesKeyword', () => {
  const order = createSeedOrders(1)[0];

  it('空关键字命中', () => {
    expect(matchesKeyword(order, '')).toBe(true);
  });

  it('命中结算单编号与对手方户名', () => {
    expect(matchesKeyword(order, order.settleNo)).toBe(true);
    expect(matchesKeyword(order, order.counterName)).toBe(true);
  });

  it('不相关内容不命中', () => {
    expect(matchesKeyword(order, 'zzz-不存在的关键字')).toBe(false);
  });
});

describe('SettleOrderRepository', () => {
  it('分页返回正确的切片与总数', async () => {
    const r = repo(12);
    const first = await r.query({ current: 1, pageSize: 5, filters: {} });
    expect(first.total).toBe(12);
    expect(first.list).toHaveLength(5);

    const last = await r.query({ current: 3, pageSize: 5, filters: {} });
    expect(last.list).toHaveLength(2);
  });

  it('按状态页签过滤', async () => {
    const r = repo(20);
    const { list, total } = await r.query({
      current: 1,
      pageSize: 50,
      filters: {},
      statusTab: SettleStatus.ToBeSettled,
    });
    expect(total).toBeGreaterThan(0);
    expect(list.every(o => o.status === SettleStatus.ToBeSettled)).toBe(true);
  });

  it('save 新增：自动生成 id 并排在最前', async () => {
    const r = repo(3);
    const created = await r.save({ ...createSeedOrders(1)[0], id: undefined });
    expect(created.id).toBeTruthy();
    expect(r.snapshot()).toHaveLength(4);
    expect(r.snapshot()[0].id).toBe(created.id);
  });

  it('save 更新：按 id 覆盖，不新增条数', async () => {
    const r = repo(3);
    const target = r.snapshot()[1];
    const updated = await r.save({ ...target, tradeNature: '已改动的交易性质' });

    expect(updated.id).toBe(target.id);
    expect(r.snapshot()).toHaveLength(3);
    expect(r.snapshot().find(o => o.id === target.id)?.tradeNature).toBe('已改动的交易性质');
  });

  it('save 传入不存在的 id 时按新增处理', async () => {
    const r = repo(2);
    const created = await r.save({ ...createSeedOrders(1)[0], id: 'settle-not-exist' });
    expect(created.id).not.toBe('settle-not-exist');
    expect(r.snapshot()).toHaveLength(3);
  });

  it('remove 返回实际删除条数，不存在 id 被忽略', async () => {
    const r = repo(5);
    const ids = r.snapshot().slice(0, 2).map(o => o.id);

    const removed = await r.remove([...ids, '不存在的id']);
    expect(removed).toBe(2);
    expect(r.snapshot()).toHaveLength(3);
  });

  it('snapshot 返回副本：外部改动不影响数据源', () => {
    const r = repo(2);
    const snap = r.snapshot();
    snap.pop();
    expect(r.snapshot()).toHaveLength(2);
  });

  it('nextSettleNo 随数据量变化', async () => {
    const r = repo(2);
    const before = r.nextSettleNo();
    await r.save({ ...createSeedOrders(1)[0], id: undefined });
    expect(r.nextSettleNo()).not.toBe(before);
  });

  it('reset 恢复为初始种子数据', async () => {
    const seed = createSeedOrders(4);
    const r = createMemoryRepository({ seed, latencyMs: 0 });

    await r.remove(seed.map(o => o.id));
    expect(r.snapshot()).toHaveLength(0);

    await r.reset();
    expect(r.snapshot()).toEqual(seed);
  });
});
