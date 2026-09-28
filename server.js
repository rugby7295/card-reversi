// 依存パッケージなしのWebSocket中継サーバー(Node.js 18以上)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const srv=http.createServer((q,r)=>{
 if(q.url==='/health'){r.end('ok');return}
 r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(fs.readFileSync(path.join(__dirname,'index.html')))});
const rooms=new Map();
function frame(str){const b=Buffer.from(str),n=b.length;let h;
 if(n<126)h=Buffer.from([0x81,n]);
 else if(n<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(n,2)}
 else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
 return Buffer.concat([h,b])}
const send=(w,m)=>{if(!w.sock.destroyed)w.sock.write(frame(JSON.stringify(m)))};
function reader(sock,onMsg){let buf=Buffer.alloc(0);
 sock.on('data',d=>{buf=Buffer.concat([buf,d]);
  for(;;){
   if(buf.length<2)return;
   const op=buf[0]&15,fin=buf[0]&128,masked=buf[1]&128;let len=buf[1]&127,off=2;
   if(len===126){if(buf.length<4)return;len=buf.readUInt16BE(2);off=4}
   else if(len===127){if(buf.length<10)return;len=Number(buf.readBigUInt64BE(2));off=10}
   if(len>16384){sock.destroy();return}
   if(masked)off+=4;
   if(buf.length<off+len)return;
   const p=Buffer.from(buf.subarray(off,off+len));
   if(masked){const k=buf.subarray(off-4,off);for(let i=0;i<len;i++)p[i]^=k[i&3]}
   buf=buf.subarray(off+len);
   if(op===8){sock.end();return}
   if(op===9)sock.write(Buffer.concat([Buffer.from([0x8a,p.length]),p]));
   else if(op===10)sock.alive=true;
   else if(op===1&&fin)onMsg(p.toString())}})}
srv.on('upgrade',(req,sock)=>{
 sock.on('error',()=>{});
 const u=new URL(req.url,'http://x'),key=req.headers['sec-websocket-key'];
 const code=(u.searchParams.get('room')||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12);
 const room=rooms.get(code)||new Set();
 if(u.pathname!=='/ws'||!key||!code||room.size>=8)return sock.destroy();
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(key+GUID).digest('base64')+'\r\n\r\n');
 const w={sock,id:Math.random().toString(36).slice(2,10),d:{}};sock.alive=true;
 rooms.set(code,room);room.add(w);
 const ps=()=>{const m={k:'ps',ps:[...room].map(x=>({id:x.id,d:x.d}))};room.forEach(x=>send(x,m))};
 send(w,{k:'hi',id:w.id});ps();
 reader(sock,raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
  if(m.k==='p'&&m.d&&typeof m.d==='object'){w.d=m.d;ps()}
  else if(m.k==='e'&&typeof m.t==='string')room.forEach(x=>{if(x!==w)send(x,{k:'e',t:m.t,d:m.d,from:w.id})})});
 const gone=()=>{if(!room.delete(w))return;if(room.size)ps();else rooms.delete(code)};
 sock.on('close',gone);sock.on('end',gone)});
setInterval(()=>rooms.forEach(r=>r.forEach(w=>{if(!w.sock.alive){w.sock.destroy();return}w.sock.alive=false;w.sock.write(Buffer.from([0x89,0]))})),25000);
srv.listen(process.env.PORT||3000,()=>console.log('listening'));
