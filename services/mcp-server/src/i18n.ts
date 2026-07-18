/**
 * MCP Server i18n — locale-aware translations for 18 languages.
 * Locale determined from MCP_LOCALE env var, falls back to "en".
 */

const messages: Record<string, Record<string, string>> = {
  en: { prompt_unknown:"Unknown prompt template: {name}. Available: {available}", resource_unknown:"Unknown resource: {uri}", error_unknown_tool:"Unknown tool: {name}", error_tool_failed:"Failed to execute {name}: {message}", processing:"Processing...", success:"Operation completed successfully." },
  fr: { prompt_unknown:"Modèle d'instruction inconnu : {name}. Disponibles : {available}", resource_unknown:"Ressource inconnue : {uri}", error_unknown_tool:"Outil inconnu : {name}", error_tool_failed:"Échec de l'exécution de {name} : {message}", processing:"Traitement en cours...", success:"Opération terminée avec succès." },
  es: { prompt_unknown:"Plantilla desconocida: {name}. Disponibles: {available}", resource_unknown:"Recurso desconocido: {uri}", error_unknown_tool:"Herramienta desconocida: {name}", error_tool_failed:"Error al ejecutar {name}: {message}", processing:"Procesando...", success:"Operación completada." },
  de: { prompt_unknown:"Unbekannte Vorlage: {name}. Verfügbar: {available}", resource_unknown:"Unbekannte Ressource: {uri}", error_unknown_tool:"Unbekanntes Werkzeug: {name}", error_tool_failed:"Ausführung fehlgeschlagen {name}: {message}", processing:"Verarbeitung...", success:"Vorgang erfolgreich." },
  ja: { prompt_unknown:"不明なテンプレート: {name}。利用可能: {available}", resource_unknown:"不明なリソース: {uri}", error_unknown_tool:"不明なツール: {name}", error_tool_failed:"実行に失敗しました {name}: {message}", processing:"処理中...", success:"操作が完了しました。" },
  ko: { prompt_unknown:"알 수 없는 템플릿: {name}。사용 가능: {available}", resource_unknown:"알 수 없는 리소스: {uri}", error_unknown_tool:"알 수 없는 도구: {name}", error_tool_failed:"실행 실패 {name}: {message}", processing:"처리 중...", success:"작업이 완료되었습니다." },
  zh: { prompt_unknown:"未知模板: {name}。可用: {available}", resource_unknown:"未知资源: {uri}", error_unknown_tool:"未知工具: {name}", error_tool_failed:"执行失败 {name}: {message}", processing:"处理中...", success:"操作完成。" },
  hi: { prompt_unknown:"अज्ञात टेम्पलेट: {name}। उपलब्ध: {available}", resource_unknown:"अज्ञात संसाधन: {uri}", error_unknown_tool:"अज्ञात उपकरण: {name}", error_tool_failed:"निष्पादन विफल {name}: {message}", processing:"प्रोसेसिंग...", success:"ऑपरेशन सफल।" },
  ar: { prompt_unknown:"قالب غير معروف: {name}。المتاح: {available}", resource_unknown:"مورد غير معروف: {uri}", error_unknown_tool:"أداة غير معروفة: {name}", error_tool_failed:"فشل التنفيذ {name}: {message}", processing:"جارٍ المعالجة...", success:"اكتملت العملية بنجاح." },
  pt: { prompt_unknown:"Modelo desconhecido: {name}。Disponível: {available}", resource_unknown:"Recurso desconhecido: {uri}", error_unknown_tool:"Ferramenta desconhecida: {name}", error_tool_failed:"Falha na execução {name}: {message}", processing:"Processando...", success:"Operação concluída." },
  ru: { prompt_unknown:"Неизвестный шаблон: {name}。Доступно: {available}", resource_unknown:"Неизвестный ресурс: {uri}", error_unknown_tool:"Неизвестный инструмент: {name}", error_tool_failed:"Ошибка выполнения {name}: {message}", processing:"Обработка...", success:"Операция выполнена." },
  it: { prompt_unknown:"Modello sconosciuto: {name}。Disponibile: {available}", resource_unknown:"Risorsa sconosciuta: {uri}", error_unknown_tool:"Strumento sconosciuto: {name}", error_tool_failed:"Esecuzione fallita {name}: {message}", processing:"Elaborazione...", success:"Operazione completata." },
  nl: { prompt_unknown:"Onbekende sjabloon: {name}。Beschikbaar: {available}", resource_unknown:"Onbekende bron: {uri}", error_unknown_tool:"Onbekend hulpmiddel: {name}", error_tool_failed:"Uitvoering mislukt {name}: {message}", processing:"Verwerken...", success:"Bewerking voltooid." },
  pl: { prompt_unknown:"Nieznany szablon: {name}。Dostępne: {available}", resource_unknown:"Nieznany zasób: {uri}", error_unknown_tool:"Nieznane narzędzie: {name}", error_tool_failed:"Wykonanie nie powiodło się {name}: {message}", processing:"Przetwarzanie...", success:"Operacja zakończona." },
  tr: { prompt_unknown:"Bilinmeyen şablon: {name}。Mevcut: {available}", resource_unknown:"Bilinmeyen kaynak: {uri}", error_unknown_tool:"Bilinmeyen araç: {name}", error_tool_failed:"Yürütme başarısız {name}: {message}", processing:"İşleniyor...", success:"İşlem tamamlandı." },
  th: { prompt_unknown:"เทมเพลตที่ไม่รู้จัก: {name}。ที่มีอยู่: {available}", resource_unknown:"ทรัพยากรที่ไม่รู้จัก: {uri}", error_unknown_tool:"เครื่องมือที่ไม่รู้จัก: {name}", error_tool_failed:"การดำเนินการล้มเหลว {name}: {message}", processing:"กำลังประมวลผล...", success:"การดำเนินการเสร็จสมบูรณ์" },
  vi: { prompt_unknown:"Mẫu không xác định: {name}。Có sẵn: {available}", resource_unknown:"Tài nguyên không xác định: {uri}", error_unknown_tool:"Công cụ không xác định: {name}", error_tool_failed:"Thực thi thất bại {name}: {message}", processing:"Đang xử lý...", success:"Thao tác hoàn tất." },
  id: { prompt_unknown:"Template tidak dikenal: {name}。Tersedia: {available}", resource_unknown:"Sumber daya tidak dikenal: {uri}", error_unknown_tool:"Alat tidak dikenal: {name}", error_tool_failed:"Eksekusi gagal {name}: {message}", processing:"Memproses...", success:"Operasi selesai." },
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
