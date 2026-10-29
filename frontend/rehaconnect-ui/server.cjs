'use strict';
// Local frontend and same-origin API proxy. No external dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const configPath = process.argv[2] || path.join(__dirname, '../../ports.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
const frontend = config.services.frontend;
const api = config.services['rehaconnect-api'];
if(config.portRange.start!==4100 || config.portRange.end!==4199)throw new Error('Expected reserved range 4100-4199');
const used = new Set();
for(const name of ['longo','rehaconnect-api','lightning-spp','frontend']) {
  const service=config.services[name];
  if(!service || service.host!=='127.0.0.1' || !Number.isInteger(service.port) || service.port<4100 || service.port>4199 || used.has(service.port) || service.url!==`http://127.0.0.1:${service.port}`)throw new Error('Invalid service port configuration');
  used.add(service.port);
}
const files = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/account', ['index.html','text/html; charset=utf-8']],
  ['/dashboard', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/integrations.js', ['integrations.js','text/javascript; charset=utf-8']],
  ['/workspace.js', ['workspace.js','text/javascript; charset=utf-8']],
  ['/assistant.js', ['assistant.js','text/javascript; charset=utf-8']],
  ['/assistant.css', ['assistant.css','text/css; charset=utf-8']],
  ['/style.css', ['style.css','text/css; charset=utf-8']]
]);
const server=http.createServer((request,response)=>{
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Cache-Control','no-store');
  let pathname;
  try{pathname=new URL(request.url,frontend.url).pathname;}catch{response.writeHead(400).end();return;}
  if(pathname.startsWith('/api/')) {
    if(!['GET','POST','PUT','DELETE'].includes(request.method)){response.writeHead(405).end();return;}
    const headers={...request.headers,host:`${api.host}:${api.port}`};
    for(const key of ['connection','proxy-connection','keep-alive','upgrade','te','trailer'])delete headers[key];
    const upstream=http.request({hostname:api.host,port:api.port,path:request.url,method:request.method,headers},result=>{
      const outgoing={...result.headers,'cache-control':'no-store','x-content-type-options':'nosniff'};
      delete outgoing.connection;
      response.writeHead(result.statusCode,outgoing);
      result.on('error',()=>response.destroy());
      result.pipe(response);
    });
    upstream.setTimeout(pathname.startsWith('/api/assistant') ? 210000 : 30000,()=>upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error',()=>{
      if(response.headersSent){response.destroy();return;}
      response.writeHead(502,{'Content-Type':'application/json'}).end(JSON.stringify({error:'API unavailable'}));
    });
    request.on('aborted',()=>upstream.destroy());
    request.pipe(upstream);
    return;
  }
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}
  const target=files.get(pathname);
  if(!target){response.writeHead(404).end();return;}
  fs.readFile(path.join(__dirname,target[0]),(error,data)=>{
    if(error){response.writeHead(503).end();return;}
    response.writeHead(200,{'Content-Type':target[1]});
    response.end(request.method==='HEAD'?undefined:data);
  });
});
server.on('error',error=>{console.error(`Frontend failed: ${error.code||'startup error'}`);process.exitCode=1;});
server.listen(frontend.port,frontend.host,()=>console.log(`RehaConnect frontend ready: ${frontend.url}`));
