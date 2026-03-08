import dotenv from 'dotenv';
import path from 'node:path';
import axios from 'axios';
import https from 'node:https';
import { createApp } from './app';

dotenv.config({path: path.resolve(__dirname, '../../.env')});

const PORT = 3001;

console.log('[Proxy] host:', process.env.PROXY_HOST);

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({rejectUnauthorized: false}),
    proxy: process.env.PROXY_HOST ? {
        host: process.env.PROXY_HOST,
        port: Number(process.env.PROXY_PORT) || 8080,
        protocol: process.env.PROXY_PROTOCOL || 'http',
    } : false,
});

const proxyUrl = process.env.PROXY_HOST
    ? `${process.env.PROXY_PROTOCOL || 'http'}://${process.env.PROXY_HOST}:${process.env.PROXY_PORT || 8080}`
    : undefined;

const app = createApp(axiosInstance, proxyUrl);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
