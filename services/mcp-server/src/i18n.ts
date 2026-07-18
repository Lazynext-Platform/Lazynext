/**
 * MCP Server i18n — locale-aware translations.
 * Locale determined from MCP_LOCALE env var, falls back to "en".
 */

const messages: Record<string, Record<string, string>> = {
  en: {
    tool_autonomous_edit: "Execute an AI-powered video editing intent on the Lazynext timeline.",
    prompt_unknown: "Unknown prompt template: {name}. Available: {available}",
    resource_unknown: "Unknown resource: {uri}",
    error_unknown_tool: "Unknown tool: {name}",
    error_tool_failed: "Failed to execute {name}: {message}",
    processing: "Processing...",
    success: "Operation completed successfully.",
  },
  fr: {
    tool_autonomous_edit: "Exécutez une intention de montage vidéo pilotée par IA sur la timeline Lazynext.",
    prompt_unknown: "Modèle d'instruction inconnu : {name}. Disponibles : {available}",
    resource_unknown: "Ressource inconnue : {uri}",
    error_unknown_tool: "Outil inconnu : {name}",
    error_tool_failed: "Échec de l'exécution de {name} : {message}",
    processing: "Traitement en cours...",
    success: "Opération terminée avec succès.",
  },
  es: {
    tool_autonomous_edit: "Ejecuta una intención de edición de video impulsada por IA en la timeline de Lazynext.",
    prompt_unknown: "Plantilla de instrucción desconocida: {name}. Disponibles: {available}",
    resource_unknown: "Recurso desconocido: {uri}",
    error_unknown_tool: "Herramienta desconocida: {name}",
    error_tool_failed: "Error al ejecutar {name}: {message}",
    processing: "Procesando...",
    success: "Operación completada exitosamente.",
  },
};

let currentLocale = process.env.MCP_LOCALE?.split("-")[0] ?? "en";
if (!messages[currentLocale]) currentLocale = "en";

export function setLocale(locale: string): void {
  const base = locale.split("-")[0];
  if (messages[base]) currentLocale = base;
}

export function t(key: string, fallback?: string): string {
  return messages[currentLocale]?.[key] ?? fallback ?? key;
}

export function getLocale(): string {
  return currentLocale;
}
