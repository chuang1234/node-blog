/**
 * 应用入口
 *
 * 装配顺序：
 *   Redux Provider → React Router → antd ConfigProvider/App（主题与多语言）
 * 主题（深/浅色）与语言由 store 驱动，App.tsx 中根据 store 状态动态调整。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Provider} from 'react-redux';
import {BrowserRouter} from 'react-router-dom';
import {ConfigProvider, App as AntdApp} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import 'antd/dist/reset.css';
import 'react-quill/dist/quill.snow.css';
import './styles/global.less';

import {store} from './store';
import {useAppSelector} from './store';
import App from './App';
import {DevSupport} from "@react-buddy/ide-toolbox";
import {ComponentPreviews, useInitial} from "@/dev";

/** 根据当前语言选择 antd 语言包 */
function WithAntdLocale({children}: { children: React.ReactNode }) {
    const lang = useAppSelector((s) => s.theme.lang);
    return (
        <ConfigProvider locale={lang === 'zh-CN' ? zhCN : enUS}>{children}</ConfigProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <WithAntdLocale>
                    <AntdApp>
                        <DevSupport ComponentPreviews={ComponentPreviews}
                                    useInitialHook={useInitial}
                        >
                            <App/>
                        </DevSupport>
                    </AntdApp>
                </WithAntdLocale>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
);
