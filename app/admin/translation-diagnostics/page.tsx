'use client';

import { useEffect, useState } from 'react';

interface DiagnosticResult {
  timestamp: string;
  tests: Record<string, any>;
  summary: {
    overallStatus: string;
    workingServices: string[];
    failedServices: string[];
  };
}

export default function TranslationDiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/translation-diagnostics');
      if (!res.ok) {
        throw new Error(`Failed to run diagnostics: ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('[TranslationDiagnostics]', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Translation Services Diagnostics</h1>
      
      <button
        onClick={runDiagnostics}
        disabled={loading}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? '⏳ Testing...' : '🔄 Run Diagnostics'}
      </button>

      {error && (
        <div style={{ color: 'red', padding: '10px', marginBottom: '20px' }}>
          ❌ Error: {error}
        </div>
      )}

      {results && (
        <div>
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
            <h3>📊 Summary</h3>
            <p>
              <strong>Status:</strong>{' '}
              {results.summary.overallStatus === 'all-services-ok' ? '✅ All OK' : '⚠️ Some failed'}
            </p>
            <p>
              <strong>Working Services:</strong> {results.summary.workingServices.join(', ') || 'None'}
            </p>
            <p>
              <strong>Failed Services:</strong> {results.summary.failedServices.join(', ') || 'None'}
            </p>
            <p style={{ fontSize: '0.8em', color: '#666' }}>
              Timestamp: {new Date(results.timestamp).toLocaleString()}
            </p>
          </div>

          <h3>📋 Detailed Results</h3>
          {Object.entries(results.tests).map(([service, result]: [string, any]) => (
            <div
              key={service}
              style={{
                marginBottom: '15px',
                padding: '10px',
                border: `2px solid ${result.status === 'ok' ? '#4CAF50' : '#f44336'}`,
                backgroundColor: result.status === 'ok' ? '#f1f8f6' : '#fef5f5',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0' }}>
                {result.status === 'ok' ? '✅' : '❌'} {service}
              </h4>
              <pre
                style={{
                  margin: 0,
                  padding: '10px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.85em',
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}

          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fffbea' }}>
            <h3>💡 Recommendations</h3>
            {results.summary.overallStatus === 'all-services-ok' ? (
              <p>✅ All translation services are working! Your translations should work fine.</p>
            ) : (
              <ul>
                {results.summary.failedServices.includes('internetConnectivity') && (
                  <li>⚠️ <strong>Internet Connectivity Issue:</strong> The server cannot reach external services. Check network settings and firewall rules.</li>
                )}
                {results.summary.failedServices.includes('dnsResolution') && (
                  <li>⚠️ <strong>DNS Resolution Issue:</strong> Cannot resolve domain names. Check DNS settings on the server.</li>
                )}
                {results.summary.failedServices.includes('myMemory') && (
                  <li>⚠️ <strong>MyMemory API Down:</strong> Primary translation service is unavailable. Check if the service is temporarily down.</li>
                )}
                {results.summary.failedServices.includes('libretranslate') && (
                  <li>⚠️ <strong>LibreTranslate Down:</strong> Fallback translation service is unavailable.</li>
                )}
                {results.summary.failedServices.length === 0 && (
                  <li>✓ No known issues detected.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd' }}>
        <h3>🛠️ What this tests:</h3>
        <ul>
          <li><strong>MyMemory:</strong> Main translation API (api.mymemory.translated.net)</li>
          <li><strong>LibreTranslate:</strong> Fallback translation service</li>
          <li><strong>Internet Connectivity:</strong> Tests if server can reach external services (pings google.com)</li>
          <li><strong>DNS Resolution:</strong> Tests if domain names can be resolved</li>
        </ul>
      </div>
    </div>
  );
}
