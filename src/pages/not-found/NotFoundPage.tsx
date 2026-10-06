import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Result } from 'antd';
import { ROUTES } from '../../constants';

/** 兜底页：未匹配任何路由时展示 */
const NotFoundPage: React.FC = () => {
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，你访问的页面不存在或已被移除。"
      extra={
        <Link to={ROUTES.HOME}>
          <Button type="primary">返回首页</Button>
        </Link>
      }
    />
  );
};

export default NotFoundPage;
