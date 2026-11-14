/**
 * Rappels de saison de l'app mobile : datés à partir du calendrier agricole de la culture (même calcul que la page
 * Calendrier), programmés sur le téléphone, donc reçus même sans internet. Chaque rappel ouvre la page utile.
 */
import type { Culture, Saisons } from "@/lib/contract";
import { calendrierCulture, semisHabituel } from "@/lib/moteur/calendrier-agricole";

export type Rappel = { id: string; date: string; titre: string; texte: string; chemin: string };

const JOUR = 86_400_000;
const ajouter = (date: string, jours: number) => new Date(Date.parse(`${date}T00:00:00Z`) + jours * JOUR).toISOString().slice(0, 10);

export function planifierRappels(c: Culture, semis: string, aujourdhui: string): Rappel[] {
  const etapes = calendrierCulture(c, semis);
  const debut = (id: string) => etapes.find((e) => e.id === id)!.debut;
  const nom = c.nom;
  const min = nom.toLowerCase();
  const recolte = debut("recolte");
  const liste: Rappel[] = [
    { id: "preparation", date: debut("preparation"), titre: `${nom} : préparez la parcelle`, texte: "Le semis approche dans 3 semaines : nettoyez la parcelle et gardez les résidus en paillage plutôt que de les brûler.", chemin: "/calendrier" },
    { id: "semis", date: semis, titre: `${nom} : période de semis`, texte: `Semez le ${min} après une pluie d'au moins 20 mm en 3 jours. Regardez l'état de semis du jour dans ForoSat.`, chemin: "/calendrier" },
    { id: "sarclage-1", date: ajouter(semis, 21), titre: `${nom} : premier sarclage`, texte: "Trois semaines après le semis : désherbez pour que la culture ne manque ni d'eau ni de nutriments.", chemin: "/calendrier" },
    { id: "sarclage-2", date: ajouter(semis, 42), titre: `${nom} : second sarclage`, texte: `Six semaines après le semis : second désherbage${c.legumineuse ? "" : ", et apport d'engrais ou de fumure si vous en avez"}.`, chemin: "/calendrier" },
    { id: "floraison", date: debut("floraison"), titre: `${nom} : début de la floraison`, texte: "Période la plus sensible au manque d'eau : paillez et surveillez les alertes de sécheresse.", chemin: "/tableau" },
    { id: "prix", date: ajouter(recolte, -14), titre: `${nom} : vos prix du marché`, texte: "La récolte approche : notez les prix du marché pour comparer la rentabilité de vos rotations.", chemin: "/rotations" },
    { id: "recolte", date: recolte, titre: `${nom} : période de récolte`, texte: "Récoltez par temps sec, puis notez votre récolte dans le carnet pour comparer avec la prévision.", chemin: "/suivi" },
  ];
  for (let j = 14, i = 1; ajouter(semis, j) < recolte; j += 14, i++) {
    liste.push({ id: `carnet-${i}`, date: ajouter(semis, j), titre: `${nom} : comment va votre champ ?`, texte: "Notez en un instant l'état de votre culture et la pluie dans le carnet de suivi.", chemin: "/suivi" });
  }
  return liste
    .filter((r) => r.date > aujourdhui)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, 20);
}

/**
 * Date de semis à planifier : celle où les pluies se sont installées cette année si la fenêtre est ouverte, sinon la
 * date habituelle ; l'année suivante si la récolte de cette année est déjà passée.
 */
export function semisAPlanifier(c: Culture, s: Saisons | null, saison: { debut: number; fin: number }, aujourdhui: string, pluiesDepuis?: string): string {
  const annee = Number(aujourdhui.slice(0, 4));
  if (pluiesDepuis?.startsWith(String(annee))) return pluiesDepuis;
  const cetteAnnee = semisHabituel(s, c.nom, annee, saison).date;
  return ajouter(cetteAnnee, c.cycleJours) < aujourdhui ? semisHabituel(s, c.nom, annee + 1, saison).date : cetteAnnee;
}
