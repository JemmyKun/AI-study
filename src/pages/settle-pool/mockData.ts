import { SettleChannel, SettleOrder, SettleStatus } from '../../types/settle-pool';
import {
  CHANNEL_OPTIONS,
  COUNTERPARTIES,
  CURRENCY_OPTIONS,
  LOCAL_ACCOUNTS,
  SETTLE_TYPE_OPTIONS,
  TRADE_NATURE_OPTIONS,
} from './constants';

/**
 * 演示用种子数据。
 *
 * 这里只负责「凭空造出一批结算单」，不持有任何可变状态——
 * 增删改一律走 repository（见 ./repository.ts），页面与 AI 工具都不再直接操作数组。
 */

/** 可复现的伪随机（0 ~ 1），保证每次生成的演示数据完全一致 */
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** 状态分布：刻意让「已结算待分设」占比更高，接近真实业务 */
const STATUS_POOL: SettleStatus[] = [
  SettleStatus.PendingSplit,
  SettleStatus.ToBeSettled,
  SettleStatus.PendingSplit,
  SettleStatus.ResidualPayFailed,
  SettleStatus.PendingSplit,
  SettleStatus.ToBeSettled,
];

const pad = (n: number, len: number) => String(n).padStart(len, '0');

/** 生成一批结算单；seedCount 决定条数 */
export function createSeedOrders(seedCount = 57): SettleOrder[] {
  return Array.from({ length: seedCount }, (_, i) => {
    const seed = i + 1;
    const r = (k: number) => rand(seed * 31 + k);
    const local = LOCAL_ACCOUNTS[Math.floor(r(1) * LOCAL_ACCOUNTS.length)];
    const counter = COUNTERPARTIES[Math.floor(r(2) * COUNTERPARTIES.length)];
    const day = 20 + Math.floor(r(3) * 10);
    const status = STATUS_POOL[Math.floor(r(4) * STATUS_POOL.length)];
    const amount = Math.round((r(5) * 8000000 + 800) * 100) / 100;

    return {
      id: `settle-${seed}`,
      settleNo: `3526092${pad(seed % 10, 1)}0000${pad(seed, 2)}`,
      settleType: SETTLE_TYPE_OPTIONS[Math.floor(r(6) * SETTLE_TYPE_OPTIONS.length)],
      tradeNature: TRADE_NATURE_OPTIONS[Math.floor(r(7) * TRADE_NATURE_OPTIONS.length)],
      amount,
      currency: CURRENCY_OPTIONS[Math.floor(r(8) * CURRENCY_OPTIONS.length)],
      status,
      localAccountNo: local.no,
      localAccountName: local.name,
      localName: local.name,
      counterAccountNo: counter.no,
      counterName: counter.name,
      channel: CHANNEL_OPTIONS[Math.floor(r(9) * CHANNEL_OPTIONS.length)] as SettleChannel,
      createdAt: `2026-09-${pad(day, 2)} 1${Math.floor(r(10) * 9)}:${pad(
        Math.floor(r(11) * 60),
        2,
      )}:00`,
    };
  });
}

/** 当前时间 YYYY-MM-DD HH:mm:ss */
export function nowString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
}
