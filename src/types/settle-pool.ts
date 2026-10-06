/** 结算状态 */
export enum SettleStatus {
  /** 已结算待分设 */
  PendingSplit = '已结算待分设',
  /** 待结算 */
  ToBeSettled = '待结算',
  /** 付残失败 */
  ResidualPayFailed = '付残失败',
}

/** 结算渠道 */
export type SettleChannel = 'SWIFT' | '银企直连';

/** 结算单 */
export interface SettleOrder {
  id: string;
  /** 结算单编号 */
  settleNo: string;
  /** 结算类型，如 F1-境外-支付 */
  settleType: string;
  /** 交易性质，如 货款/服务费 */
  tradeNature: string;
  /** 金额 */
  amount: number;
  /** 币种，如 HKD-港元 */
  currency: string;
  /** 状态 */
  status: SettleStatus;
  /** 本方账号 */
  localAccountNo: string;
  /** 本方账号户名 */
  localAccountName: string;
  /** 本方户名 */
  localName: string;
  /** 对手方账号 */
  counterAccountNo: string;
  /** 对手方户名 */
  counterName: string;
  /** 结算渠道 */
  channel: SettleChannel;
  /** 创建时间 YYYY-MM-DD HH:mm:ss */
  createdAt: string;
}
