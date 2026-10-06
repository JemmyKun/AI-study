import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import { ROUTES } from '../../constants';
import { useLocale } from '../../locales';

/** 兜底页：未匹配任何路由时展示 */
const NotFoundPage: React.FC = () => {
  const { t } = useLocale();

  return (
    <Result
      status="404"
      title="404"
      subTitle={t('notFound.desc')}
      extra={
        <Link to={ROUTES.HOME}>
          <Button type="primary">{t('notFound.backHome')}</Button>
        </Link>
      }
    />
  );
};

export default NotFoundPage;
