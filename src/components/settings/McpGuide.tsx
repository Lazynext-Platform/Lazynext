// Trusted editor guide for the authenticated Streamable HTTP endpoint.
import { useEffect, useState } from 'react';
import { editorBootstrapInfo } from '../../agent/editor-credential';
import { theme } from '../../theme';
import { useT } from '../../i18n/locale';
import { Icon } from '../icons';

interface Snippet {
 label: string;
 code: string;
}

function snippets(endpoint: string, token: string): Snippet[] {
 return [
 {
 label: 'Claude Code',
 code: `claude mcp add --transport http -H Authorization: Bearer ${token} lazynext ${endpoint}`,
 },
 {
 label: 'Codex',
 code: `export LAZYNEXT_MCP_TOKEN=${token}\\ncodex mcp add lazynext --url ${endpoint} --bearer-token-env-var LAZYNEXT_MCP_TOKEN`,
 },
 {
 label: 'Cursor (~/.cursor/mcp.json)',
 code: JSON.stringify({
 mcpServers: {
 lazynext: {
 type: 'http',
 url: endpoint,
 headers: { Authorization: `Bearer ${token}` },
 },
 },
 }, null, 2),
 },
 ];
}

function CopyButton({ text }: { text: string }) {
 const t = useT();
 const [copied, setCopied] = useState(false);
 return (
 <button
 type="button"
 onClick={() => {
 void navigator.clipboard?.writeText(text).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 1600);
 });
 }}
 style={{
 flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4,
 padding: '3px 8px', border: `0.5px solid ${theme.border}`, borderRadius: 4,
 background: theme.hover, color: copied ? theme.accent : theme.textMuted,
 fontSize: 11, cursor: 'pointer',
 }}
 >
 <Icon name={copied ? 'check' : 'copy'} size={11} />
 {copied ? t('Copied') : t('Copy')}
 </button>
 );
}

export function McpGuideDialog({ onClose }: { onClose: () => void }) {
 const t = useT();
 const endpoint = `${window.location.origin}/api/external-mcp/mcp`;
 const [mcpToken, setMcpToken] = useState<string | null>(null);
 const [tokenError, setTokenError] = useState(false);
 useEffect(() => {
 let active = true;
 void editorBootstrapInfo().then(
 (info) => { if (active) setMcpToken(info.mcpToken); },
 () => { if (active) setTokenError(true); },
 );
 return () => { active = false; };
 }, []);
 const codeStyle: React.CSSProperties = {
 margin: 0, padding: '7px 9px', border: `0.5px solid ${theme.borderLight}`, borderRadius: 4,
 background: theme.inset, color: theme.text, fontSize: 11.5, lineHeight: 1.5,
 fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
 whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'text',
 };
 return (
 <div className="cc-modal-backdrop" onPointerDown={onClose}>
 <div
 className="cc-modal"
 style={{ width: 560, gap: 10, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}
 onPointerDown={(event) => event.stopPropagation()}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
 <Icon name="plug" size={15} />
 <strong style={{ fontSize: 14 }}>{t('External agents (MCP)')}</strong>
 <button type="button" onClick={onClose} style={{ marginLeft: 'auto', padding: '3px 9px' }}>{t('Close')}</button>
 </div>
 <div style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.55 }}>
 {t('Lazynext Streamable HTTP MCP Claude Code / Codex / Cursor Agent , Agent ,')}
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <span style={{ fontSize: 12, fontWeight: 600 }}>{t('Built-in Agent vs external MCP')}</span>
 <div style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.55 }}>
 {t(' Agent MCP manual auto review EditorCore ')}
 </div>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <span style={{ fontSize: 12, fontWeight: 600 }}>{t('Connect a local model')}</span>
 <div style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.55 }}>
 {t(' → Agent Model → Agent Brain → OpenAI API URL Responses API Chat Completions API“Load models” API Key')}
 </div>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
 <span style={{ fontSize: 12, fontWeight: 600 }}>{t('Endpoint')}</span>
 <CopyButton text={endpoint} />
 </div>
 <pre style={codeStyle}>{endpoint}</pre>
 </div>

 {mcpToken ? snippets(endpoint, mcpToken).map((snippet) => (
 <div key={snippet.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
 <span style={{ fontSize: 12, fontWeight: 600 }}>{snippet.label}</span>
 <CopyButton text={snippet.code} />
 </div>
 <pre style={codeStyle}>{snippet.code}</pre>
 </div>
 )) : (
 <div style={{ color: tokenError ? theme.danger : theme.textMuted, fontSize: 12 }}>
 {tokenError ? t(' MCP ') : t('Loading the MCP connection token')}
 </div>
 )}

 <div style={{ color: theme.textDim, fontSize: 11.5, lineHeight: 1.55, borderTop: `0.5px solid ${theme.borderLight}`, paddingTop: 8 }}>
 {t('MCP Bearer LAZYNEXT_MCP_TOKEN ')}
 </div>
 </div>
 </div>
 );
}
