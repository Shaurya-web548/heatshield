// Worker advisories (EN + Hindi), generated from the same simulation numbers
// so they can never contradict the map. Re-issued at every whole hour.
// A live-AI layer (Stage 7) may replace these; it falls back here silently.

import { type City, type CoolingPoint, COOLING_LABEL } from "@/data/cities";
import { distanceKm } from "@/lib/geo";
import { airTempC, formatHour, type ZoneRisk } from "@/lib/heat";

export type Urgency = "ADVISORY" | "WARNING" | "EMERGENCY";

export type Advisory = {
  headline: string;
  advisory_en: string;
  advisory_hi: string;
  urgency: Urgency;
};

const listEn = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs.at(-1);
const listHi = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " और " + xs.at(-1);

export function nearestCooling(
  city: City,
  point: { lat: number; lng: number }
): { point: CoolingPoint; distanceKm: number } {
  const ranked = city.coolingPoints
    .map((p) => ({ point: p, distanceKm: distanceKm(point, p) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return ranked[0];
}

export function generateAdvisory(
  city: City,
  hour: number,
  risks: ZoneRisk[]
): Advisory {
  const h = Math.floor(hour);
  const critical = risks.filter((r) => r.level === "CRITICAL");
  const alert = risks.filter((r) => r.level === "ALERT");
  const top = risks[0];
  const temp = airTempC(city, h);
  const cooling = nearestCooling(city, top.zone.center).point;
  const coolingLabel = COOLING_LABEL[cooling.kind].toLowerCase();

  const urgency: Urgency =
    critical.length > 0 ? "EMERGENCY" : alert.length > 0 ? "WARNING" : "ADVISORY";

  const headline =
    critical.length > 0
      ? `${critical.length} zone${critical.length > 1 ? "s" : ""} critical — stop outdoor work`
      : alert.length > 0
        ? `Heat alert in ${alert.length} zone${alert.length > 1 ? "s" : ""} — limit exposure`
        : h < 11
          ? `${city.imd.level} day ahead — plan work before noon`
          : `Heat easing — resume with care`;

  const en: string[] = [];
  const hi: string[] = [];

  en.push(
    `${city.name} heat advisory for outdoor workers, issued ${formatHour(h)}. IMD ${city.imd.level.toLowerCase()} (${city.imd.colourCode.toLowerCase()} alert); air temperature ${temp.toFixed(0)} °C.`
  );
  hi.push(
    `${city.name} — बाहर काम करने वालों के लिए गर्मी परामर्श, ${formatHour(h)} बजे जारी। IMD ${city.imd.level === "Severe heatwave" ? "भीषण लू" : city.imd.level === "Heatwave" ? "लू" : "सामान्य"} (${city.imd.colourCode === "Red" ? "लाल" : city.imd.colourCode === "Orange" ? "नारंगी" : "पीला"} अलर्ट); हवा का तापमान ${temp.toFixed(0)} °C।`
  );

  if (critical.length > 0) {
    const names = critical.slice(0, 3).map((r) => r.zone.name);
    en.push(
      `Localized heat is critical in ${listEn(names)}${critical.length > 3 ? ` and ${critical.length - 3} more zones` : ""} (feels like ${top.feelsLikeC.toFixed(0)} °C). Street vendors, traffic staff and delivery riders there should stop work and move to shade now.`
    );
    hi.push(
      `${listHi(names)}${critical.length > 3 ? ` और ${critical.length - 3} अन्य क्षेत्रों` : ""} में स्थानीय गर्मी गंभीर स्तर पर है (महसूस होने वाला तापमान ${top.feelsLikeC.toFixed(0)} °C)। वहाँ के रेहड़ी-पटरी वाले, यातायात कर्मी और डिलीवरी कर्मी अभी काम रोकें और छाया में जाएँ।`
    );
  } else if (alert.length > 0) {
    const names = alert.slice(0, 3).map((r) => r.zone.name);
    en.push(
      `Heat is at alert level in ${listEn(names)}${alert.length > 3 ? ` and ${alert.length - 3} more zones` : ""}. Limit outdoor work to essentials and take a shade break every 30 minutes.`
    );
    hi.push(
      `${listHi(names)}${alert.length > 3 ? ` और ${alert.length - 3} अन्य क्षेत्रों` : ""} में गर्मी अलर्ट स्तर पर है। बाहर का काम केवल ज़रूरी कामों तक सीमित रखें और हर 30 मिनट में छाया में विश्राम करें।`
    );
  } else if (h < 11) {
    en.push(
      `Conditions are still manageable. Finish heavy outdoor work before 11:00; ${top.zone.name} will heat fastest this afternoon.`
    );
    hi.push(
      `अभी स्थिति संभालने योग्य है। भारी बाहरी काम 11:00 बजे से पहले पूरा करें; दोपहर में ${top.zone.name} सबसे तेज़ी से गर्म होगा।`
    );
  } else {
    en.push(
      `Heat is easing but surfaces stay hot after sunset. Keep drinking water and avoid long stretches on open asphalt.`
    );
    hi.push(
      `गर्मी कम हो रही है लेकिन सूर्यास्त के बाद भी सतहें गर्म रहती हैं। पानी पीते रहें और खुली सड़क पर लंबे समय तक रहने से बचें।`
    );
  }

  en.push(
    `Nearest relief for ${top.zone.name}: ${cooling.name} (${coolingLabel}). Drink water every 20 minutes; call 108 for heat illness.`
  );
  hi.push(
    `${top.zone.name} के लिए निकटतम राहत: ${cooling.name}। हर 20 मिनट में पानी पिएँ; लू लगने पर 108 पर कॉल करें।`
  );

  return { headline, advisory_en: en.join(" "), advisory_hi: hi.join(" "), urgency };
}
