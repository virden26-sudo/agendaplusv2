'use client';
import {useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export function AiConnection() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    setUrl(localStorage.getItem('agendaRemoteApiBaseUrl') || '');
    setToken(sessionStorage.getItem('agendaRemoteApiToken') || '');
  }, []);

  const save = async () => {
    setTesting(true);
    try {
      let value = '';
      if (url.trim()) {
        const parsed = new URL(url.trim());
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
        if (parsed.username || parsed.password || parsed.search || parsed.hash ||
            (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))) {
          throw new Error('Use an HTTPS service URL, or HTTP on localhost. Keep credentials out of the URL.');
        }
        value = parsed.href.replace(/\/+$/, '');
      }
      localStorage.setItem('agendaRemoteApiBaseUrl', value);
      localStorage.removeItem('agendaApiBaseUrl');
      sessionStorage.setItem('agendaRemoteApiToken', value ? token.trim() : '');
      if (!value) {
        setMessage('External connection cleared. Local practice remains available.');
        return;
      }
      setMessage('Connection saved. Testing access…');
      const response = await fetch(`${value}/api/connection`, {
        headers: token.trim() ? {'X-Agenda-Token': token.trim()} : {},
        signal: AbortSignal.timeout(10000), cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Connection saved, but access was denied. Check the access token.');
      }
      if (!response.ok) throw new Error(`Connection saved, but the service returned HTTP ${response.status}.`);
      const result = await response.json();
      if (result.ok !== true || result.service !== 'Agenda+') throw new Error('That URL did not return an Agenda+ service.');
      setMessage('Connected to Agenda+. The access token lasts for this app session. AI teaching also needs a model; portal extraction needs a browser and your school sign-in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to the service.');
    } finally {
      setTesting(false);
    }
  };

  return <details className="rounded border p-3">
    <summary className="cursor-pointer font-medium">Optional AI and portal service</summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">Desktop includes its local service. On Android or iOS, connect a service you control for broader explanations and automatic portal extraction. Imported instructions and chat are sent to that service when you use those features. Offline practice needs no connection.</p>
      <label htmlFor="ai-service-url">Service URL</label>
      <Input id="ai-service-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-service.example" />
      <label htmlFor="ai-service-token">Access token (this session only)</label>
      <Input id="ai-service-token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} />
      <Button variant="outline" disabled={testing} onClick={() => void save()}>{testing ? 'Testing connection…' : 'Save and test connection'}</Button>
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
