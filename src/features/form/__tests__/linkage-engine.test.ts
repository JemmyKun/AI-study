import { FormField, FormSchema, LinkageRule } from '../../../types/form';
import { evaluateLinkages } from '../linkage-engine';

/** rule 模式下 formInstance 不参与计算，传空对象即可 */
const FORM = {} as any;

type Condition = NonNullable<LinkageRule['conditions']>[number];

function makeSchema(linkages: LinkageRule[]): FormSchema {
  const fields: FormField[] = [
    { id: 'f1', type: 'select', label: '触发字段', name: 'trigger', span: 12, linkages },
    { id: 'f2', type: 'input', label: '目标字段', name: 'target', span: 12 },
  ];
  return { version: '1.0', title: '联动测试表单', fields };
}

function rule(conditions: Condition[] | undefined, actions: NonNullable<LinkageRule['actions']>) {
  return makeSchema([{ triggerField: 'trigger', conditions, actions }]);
}

describe('evaluateLinkages - rule 模式', () => {
  it('没有字段配置联动规则时返回空', () => {
    expect(evaluateLinkages(makeSchema([]), {}, 'trigger', 'A', FORM)).toEqual({});
  });

  it('triggerField 不匹配时返回空', () => {
    const schema = makeSchema([
      { triggerField: 'other', actions: [{ targetField: 'target', type: 'hidden' }] },
    ]);
    expect(evaluateLinkages(schema, {}, 'trigger', 'A', FORM)).toEqual({});
  });

  it('条件满足时应用全部 actions', () => {
    const schema = rule([{ operator: 'eq', value: 'A' }], [
      { targetField: 'target', type: 'hidden' },
      { targetField: 'target', type: 'setValue', value: '自动填充' },
    ]);
    expect(evaluateLinkages(schema, {}, 'trigger', 'A', FORM)).toEqual({
      target: { visible: false, value: '自动填充' },
    });
  });

  it('条件不满足时不产生任何状态', () => {
    const schema = rule([{ operator: 'eq', value: 'A' }], [
      { targetField: 'target', type: 'hidden' },
    ]);
    expect(evaluateLinkages(schema, {}, 'trigger', 'B', FORM)).toEqual({});
  });

  it('省略 conditions 视为条件成立', () => {
    const schema = rule(undefined, [{ targetField: 'target', type: 'required' }]);
    expect(evaluateLinkages(schema, {}, 'trigger', '任意值', FORM)).toEqual({
      target: { required: true },
    });
  });

  it('多个条件之间是「与」关系', () => {
    const schema = rule(
      [
        { operator: 'gt', value: 10 },
        { operator: 'lt', value: 20 },
      ],
      [{ targetField: 'target', type: 'enabled' }],
    );
    expect(evaluateLinkages(schema, {}, 'trigger', 15, FORM)).toEqual({
      target: { disabled: false },
    });
    expect(evaluateLinkages(schema, {}, 'trigger', 30, FORM)).toEqual({});
  });

  it('支持 eq / neq / gt / lt / contains / notContains', () => {
    const cases: { c: Condition; actual: any; met: boolean }[] = [
      { c: { operator: 'eq', value: 1 }, actual: 1, met: true },
      { c: { operator: 'neq', value: 1 }, actual: 2, met: true },
      { c: { operator: 'gt', value: 10 }, actual: 11, met: true },
      { c: { operator: 'gt', value: 10 }, actual: 9, met: false },
      { c: { operator: 'lt', value: 10 }, actual: 9, met: true },
      { c: { operator: 'lt', value: 10 }, actual: 11, met: false },
      { c: { operator: 'contains', value: 'b' }, actual: ['a', 'b'], met: true },
      { c: { operator: 'contains', value: 'z' }, actual: ['a', 'b'], met: false },
      { c: { operator: 'notContains', value: 'z' }, actual: ['a', 'b'], met: true },
    ];

    cases.forEach(({ c, actual, met }) => {
      const schema = rule([c], [{ targetField: 'target', type: 'visible' }]);
      const result = evaluateLinkages(schema, {}, 'trigger', actual, FORM);
      expect(result.target?.visible).toBe(met ? true : undefined);
    });
  });

  it('setOptions 会写入下拉选项', () => {
    const options = [{ label: '一', value: '1' }];
    const schema = rule([{ operator: 'eq', value: 'A' }], [
      { targetField: 'target', type: 'setOptions', value: options },
    ]);
    expect(evaluateLinkages(schema, {}, 'trigger', 'A', FORM).target?.options).toEqual(options);
  });

  it('未知运算符视为条件不成立', () => {
    const schema = rule([{ operator: 'unknown' as Condition['operator'], value: 1 }], [
      { targetField: 'target', type: 'visible' },
    ]);
    expect(evaluateLinkages(schema, {}, 'trigger', 1, FORM)).toEqual({});
  });
});

describe('evaluateLinkages - handler 模式', () => {
  it('找不到对应处理器时返回空，不影响其他规则', () => {
    const schema = makeSchema([
      { triggerField: 'trigger', mode: 'handler', handlerId: '不存在的处理器' },
    ]);
    expect(evaluateLinkages(schema, { trigger: 'A' }, 'trigger', 'A', FORM)).toEqual({});
  });
});
