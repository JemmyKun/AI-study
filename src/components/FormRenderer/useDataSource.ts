import { useState, useEffect, useRef } from 'react';
import { DataSourceConfig } from '../../types/form';

interface UseDataSourceReturn {
    options: { label: string; value: string }[];
    loading: boolean;
    error: string | null;
}

// 内存级缓存：基于 URL+params 的 key
const cache = new Map<string, { label: string; value: string }[]>();

function getCacheKey(config: DataSourceConfig): string {
    return `${config.url}:${JSON.stringify(config.params || {})}`;
}

function extractByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function useDataSource(config?: DataSourceConfig): UseDataSourceReturn {
    const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!config || config.type !== 'api' || !config.url) {
            return;
        }

        const cacheKey = getCacheKey(config);

        // 检查缓存
        if (cache.has(cacheKey)) {
            setOptions(cache.get(cacheKey)!);
            return;
        }

        // 防止重复请求
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const method = config.method || 'GET';
                let url = config.url!;

                // URL 模板变量解析（简单替换 {xxx}）
                if (config.params) {
                    Object.entries(config.params).forEach(([key, value]) => {
                        url = url.replace(`{${key}}`, String(value));
                    });
                }

                const fetchOptions: RequestInit = { method };
                if (method === 'POST' && config.params) {
                    fetchOptions.body = JSON.stringify(config.params);
                    fetchOptions.headers = { 'Content-Type': 'application/json' };
                }

                const response = await fetch(url, fetchOptions);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                const rawData = config.dataPath ? extractByPath(data, config.dataPath) : data;

                const labelField = config.labelField || 'label';
                const valueField = config.valueField || 'value';

                const mappedOptions = Array.isArray(rawData)
                    ? rawData.map((item: any) => ({
                        label: item[labelField],
                        value: item[valueField],
                    }))
                    : [];

                // 写入缓存
                cache.set(cacheKey, mappedOptions);
                setOptions(mappedOptions);
            } catch (err: any) {
                console.warn('[FormRenderer] 数据源请求失败，将回退到静态选项:', err.message);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            fetchedRef.current = false;
        };
    }, [config?.url, config?.type, config?.method, JSON.stringify(config?.params)]);

    return { options, loading, error };
}
