/*
 * @Author: lizhengkun
 * @Description: 应用入口：只做挂载，业务逻辑一律下沉到 app/ 与各页面模块
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@copilotkit/react-core/v2/styles.css';
import './styles/global.css';
import App from './app/App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 如需采集性能指标，传入回调即可：reportWebVitals(console.log)
// 详见 https://bit.ly/CRA-vitals
reportWebVitals();
