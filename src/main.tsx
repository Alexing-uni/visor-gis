import React from 'react';
import '@ant-design/v5-patch-for-react-19';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import App from './App.tsx';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#086b86', borderRadius: 7, fontFamily: 'Inter, system-ui, sans-serif' } }}><App/></ConfigProvider></React.StrictMode>,
);
