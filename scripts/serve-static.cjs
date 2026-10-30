// Local preview of the exact static bundle shipped inside native apps.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'out');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain'};
http.createServer((req,res) => {
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400).end();return;}
  const base = path.resolve(root, '.' + pathname);
  if (base !== root && !base.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  const file = [base, base+'.html', path.join(base,'index.html')].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!file) {res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 3000),'127.0.0.1');
