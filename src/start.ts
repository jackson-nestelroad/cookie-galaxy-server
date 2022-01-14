import {CookieGalaxyServer} from './cookie-galaxy';
import {config} from 'dotenv';

config();

const port = parseInt(process.env.PORT || '') || 8080;

const server = new CookieGalaxyServer();
server.start(port);
