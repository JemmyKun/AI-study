import { useState, useCallback } from 'react';
import { FormSchema, FieldLinkageState } from '../../types/form';
import { evaluateLinkages } from '../../features/form/linkage-engine';

/**
 * 联动逻辑 Hook
 * 监听表单值变化，计算字段联动状态
 */
export function useLinkage(schema: FormSchema, formInstance: any) {
    const [linkageStates, setLinkageStates] = useState<Record<string, FieldLinkageState>>({});

    const handleValuesChange = useCallback(
        (changedValues: Record<string, any>, allValues: Record<string, any>) => {
            for (const [fieldName, fieldValue] of Object.entries(changedValues)) {
                const newStates = evaluateLinkages(schema, allValues, fieldName, fieldValue, formInstance);
                if (Object.keys(newStates).length > 0) {
                    setLinkageStates(prev => ({ ...prev, ...newStates }));
                }
            }
        },
        [schema, formInstance]
    );

    const getFieldState = useCallback(
        (fieldName: string): FieldLinkageState | undefined => {
            return linkageStates[fieldName];
        },
        [linkageStates]
    );

    const resetLinkageStates = useCallback(() => {
        setLinkageStates({});
    }, []);

    return {
        linkageStates,
        handleValuesChange,
        getFieldState,
        resetLinkageStates,
    };
}
