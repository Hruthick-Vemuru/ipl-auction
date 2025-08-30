import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config.js';
export function auth(req,res,next){ const hdr = req.headers.authorization||''; const token = hdr.startsWith('Bearer ')? hdr.slice(7): null; if(!token) return res.status(401).json({ error:'No token' }); try{ const payload = jwt.verify(token, JWT_SECRET); req.user = payload; next(); }catch(e){ res.status(401).json({ error:'Invalid token' }); } }
export function requireRole(role){ return (req,res,next)=>{ if(!req.user || req.user.role!==role) return res.status(403).json({ error:'Forbidden' }); next(); }; };
