import { SettleChannel, SettleStatus } from '../../types/settle-pool';

/**
 * 结算池的枚举选项与固定文案的唯一来源。
 *
 * 原先结算类型/币种等在三处各写一份（列表页筛选、编辑页下拉、mock 种子数据），
 * 且币种数量不一致（8 / 10 / 10），会出现「筛选项里选不到已有数据」的问题。
 * 现在统一到这里：种子数据从这些常量派生，筛选与下拉也读这里。
 */

/** 结算类型 */
export const SETTLE_TYPE_OPTIONS = ['F1-境外-支付', 'F2-境内-收款', 'F3-境外-退款'];

/** 交易性质 */
export const TRADE_NATURE_OPTIONS = [
  '货款', '服务费', '市场推广费', '模具开发费', '保险赔付', '国际运费',
  '劳务费', '技术咨询费', '设备采购款', '样品费', '关税', '仓储费',
];

/** 币种：与种子数据同源，保证筛选下拉能覆盖到所有已存在的取值 */
export const CURRENCY_OPTIONS = [
  'HKD-港元', 'USD-美元', 'EUR-欧元', 'SGD-新加坡元', 'THB-泰铢',
  'GBP-英镑', 'JPY-日元', 'IDR-印度尼西亚卢比', 'KRW-韩元', 'AUD-澳元',
];

/** 结算渠道 */
export const CHANNEL_OPTIONS: SettleChannel[] = ['SWIFT', '银企直连'];

/** 结算状态（编辑页可选） */
export const STATUS_OPTIONS: SettleStatus[] = [
  SettleStatus.ToBeSettled,
  SettleStatus.PendingSplit,
  SettleStatus.ResidualPayFailed,
];

/** 本方账户：账号 + 户名，种子数据与筛选下拉共用 */
export const LOCAL_ACCOUNTS: { no: string; name: string }[] = [
  { no: 'B3T1012345678', name: 'GT国贸控股(香港)' },
  { no: 'B3T10880000001234', name: 'GT国贸控股(香港)' },
  { no: 'B3T10880000012324', name: 'GT国贸( shield子公司)' },
  { no: 'HU417116301111110...', name: 'HU-匈牙利副国' },
  { no: 'DE125001000001234...', name: 'GT国贸柏林分公司' },
  { no: 'GB72HBUK4012345612...', name: 'GT英国有限公司' },
  { no: '75101234567', name: '兴业' },
  { no: 'G874BUK40123456...', name: 'GT英国有限公司' },
];

/** 本方账户下拉只需账号 */
export const LOCAL_ACCOUNT_OPTIONS: string[] = LOCAL_ACCOUNTS.map(a => a.no);

/** 竞争对手方（仅用于生成演示数据） */
export const COUNTERPARTIES: { no: string; name: string }[] = [
  { no: 'DE67730040000561574...', name: 'Rhein Automotive Teile G...' },
  { no: 'DE0727040406451574...', name: 'Rhein Automotive Teile G...' },
  { no: '100938201573', name: 'Greenwich Components Inc.' },
  { no: '121311530', name: 'Orchard Materials Trading ...' },
  { no: '1117509042', name: 'Merlion Logistics Pte Ltd.' },
  { no: '932258440425', name: 'Moserbaer India Ltd.' },
  { no: '928409616664', name: 'PT Cahaya Komputer Utama...' },
  { no: '3107134011800', name: 'PT Sinar Elektronik' },
  { no: '6823670184679', name: 'Nordeste Embalagens S.A.' },
  { no: 'HU62116301111110...', name: 'Budapest Trade Kft.' },
];
