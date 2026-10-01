import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
const deny = () => { throw Error('PASS1: outbound network denied; use a local fixture'); };
globalThis.fetch = deny;
net.connect = net.createConnection = tls.connect = http.request = http.get = https.request = https.get = deny;
