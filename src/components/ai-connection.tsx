'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export function AiConnection() {
 const [url,setUrl]=useState(''); const [token,setToken]=useState(''); const [message,setMessage]=useState('');
 useEffect(()=>{setUrl(localStorage.getItem('agendaRemoteApiBaseUrl') || '');setToken(sessionStorage.getItem('agendaRemoteApiToken') || '');},[]);
 const save=()=>{
   try {
     let value='';
     if (url.trim()) {
       const parsed=new URL(url.trim());
       const local=['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
       if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))) throw new Error('Use an HTTPS service URL, or HTTP on localhost. Keep credentials out of the URL.');
       value=parsed.href.replace(/\/+$/,'');
     }
     localStorage.setItem('agendaRemoteApiBaseUrl',value);
     sessionStorage.setItem('agendaRemoteApiToken',value ? token.trim() : '');
     setMessage(value ? 'Connection saved. The access token lasts for this app session.' : 'External connection cleared. Local practice remains available.');
   } catch(error){setMessage(error instanceof Error ? error.message : 'Invalid service URL');}
 };
 return <details className="rounded border p-3"><summary className="cursor-pointer font-medium">Optional AI and portal service</summary><div className="mt-3 space-y-3"><p className="text-sm text-muted-foreground">Desktop includes its local service. On Android, you can connect a service you control for broader explanations and automatic portal extraction. Imported instructions and chat are sent to that service when you use those features. Offline practice needs no connection.</p><label htmlFor="ai-service-url">Service URL</label><Input id="ai-service-url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://your-service.example" /><label htmlFor="ai-service-token">Access token (this session only)</label><Input id="ai-service-token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} /><Button variant="outline" onClick={save}>Save connection</Button>{message && <p role="status">{message}</p>}</div></details>;
}
