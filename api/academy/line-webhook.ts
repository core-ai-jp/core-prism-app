import type {VercelRequest,VercelResponse} from '@vercel/node';
import handler from './index.js';
export const config={api:{bodyParser:false},maxDuration:120};
export default async function rawWebhook(req:VercelRequest,res:VercelResponse){
  let size=0;const chunks:Buffer[]=[];
  for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>262144)return res.status(413).end();chunks.push(b);}
  req.body=Buffer.concat(chunks).toString('utf8');req.query.action='webhook';
  return handler(req,res);
}
