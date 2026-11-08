import json
import unittest
from datetime import date
from pathlib import Path

from climat_complet import alertes, climat_complet, libelle_saisons
from etat_du_moment import etat_du_moment

ICI = Path(__file__).resolve().parent
MENSUEL = json.loads((ICI / "fixtures" / "korhogo_mensuel.json").read_text(encoding="utf-8"))
JOURS = json.loads((ICI / "fixtures" / "korhogo_jours.json").read_text(encoding="utf-8"))
KORHOGO = {"id": "poro", "nom": "Poro", "chefLieu": "Korhogo", "lat": 9.4581, "lon": -5.6316}
AUJ = date(2026, 11, 7)


class TestAlertes(unittest.TestCase):
    def test_forte_chaleur_et_deux_saisons(self):
        a = alertes([10] * 12, [30, 39] + [30] * 10, [0.3] * 3 + [0.6] * 9, [(3, 6), (10, 10)])
        titres = [x["titre"] for x in a]
        self.assertIn("Forte chaleur en février", titres)
        self.assertIn("Deux saisons des pluies", titres)
        self.assertEqual(next(x for x in a if x["titre"].startswith("Forte")).get("type"), "surveiller")

    def test_toujours_au_moins_une_alerte(self):
        self.assertGreaterEqual(len(alertes([10] * 12, [30] * 12, [0.5] * 12, [(5, 9)])), 1)


class TestEtatDuMoment(unittest.TestCase):
    normales = {"pluie": [100.0] * 12, "chaleur": [33.0] * 12, "sol": [0.5] * 12}

    def jours(self, n_valides: int, total: int = 30):
        p = {"PRECTOTCORR": {}, "T2M_MAX": {}, "GWETROOT": {}}
        for i in range(total):
            cle = f"202610{i + 1:02d}"
            ok = i < n_valides
            p["PRECTOTCORR"][cle] = 1.0 if ok else -999.0
            p["T2M_MAX"][cle] = 36.0 if ok else -999.0
            p["GWETROOT"][cle] = 0.4 if ok else -999.0
        return {"properties": {"parameter": p}}

    def test_ignore_les_jours_manquants(self):
        e = etat_du_moment(self.jours(25), self.normales, [(5, 10)], date(2026, 11, 1))
        self.assertIn("25 jours", e["texte"])
        self.assertEqual(e["tuiles"][0]["valeur"], "25 mm")

    def test_moins_de_20_jours_valides_donne_none(self):
        self.assertIsNone(etat_du_moment(self.jours(19), self.normales, [(5, 10)], date(2026, 11, 1)))

    def test_alertes_sur_les_tuiles(self):
        e = etat_du_moment(self.jours(30), self.normales, [(5, 10)], date(2026, 11, 1))
        niveaux = {t["label"]: t["niveau"] for t in e["tuiles"]}
        self.assertEqual(niveaux["Pluie (30 j)"], "alerte")  # 30 mm pour une normale de 100
        self.assertEqual(niveaux["Chaleur"], "alerte")  # 36 °C pour une normale de 33
        self.assertEqual(niveaux["Humidité du sol"], "alerte")  # 0,40 pour une normale de 0,50

    def test_saison(self):
        hors = etat_du_moment(self.jours(30), self.normales, [(5, 10)], date(2026, 11, 1))
        self.assertEqual(hors["saison"], "Saison sèche")
        self.assertEqual(hors["accent"], "mai")
        dans = etat_du_moment(self.jours(30), self.normales, [(5, 10)], date(2026, 8, 1))
        self.assertEqual(dans["saison"], "Saison des pluies")
        self.assertEqual(dans["accent"], "octobre")


class TestClimatComplet(unittest.TestCase):
    def test_korhogo_entierement_reel(self):
        c = climat_complet(MENSUEL, JOURS, KORHOGO, AUJ)
        self.assertNotIn("grace", c)
        self.assertEqual([o["id"] for o in c["onglets"]], ["pluie", "chaleur", "sol"])
        self.assertEqual([m["label"] for m in c["matrice"]], ["Pluie", "Chaleur", "Humidité du sol"])
        self.assertEqual(c["meta"]["reel"], ["pluie", "chaleur", "humidité du sol"])
        self.assertNotIn("exempleDe", c["meta"])
        self.assertTrue(c["indicateurs"][3]["label"].startswith("Sol le plus sec"))
        self.assertIsNotNone(c["actuel"])
        self.assertEqual(len(c["saisons"]), 1)
        self.assertEqual(c["saisonPluies"], c["saisons"][0])

    def test_libelle_saisons(self):
        self.assertEqual(libelle_saisons([(3, 6), (10, 10)]), "Mars → Juin · Oct")


if __name__ == "__main__":
    unittest.main()


class TestNormaleParJour(unittest.TestCase):
    def test_normale_ponderee_par_le_mois_de_chaque_jour(self):
        p = {"PRECTOTCORR": {}, "T2M_MAX": {}, "GWETROOT": {}}
        from datetime import timedelta
        d = date(2026, 10, 8)
        for _ in range(28):  # 8 octobre → 4 novembre : 24 jours d'octobre, 4 de novembre
            k = d.strftime("%Y%m%d")
            p["PRECTOTCORR"][k], p["T2M_MAX"][k], p["GWETROOT"][k] = 1.0, 33.0, 0.5
            d += timedelta(days=1)
        normales = {"pluie": [0] * 9 + [101.0, 19.0, 0], "chaleur": [0] * 9 + [32.0, 36.0, 0], "sol": [0] * 9 + [0.6, 0.4, 0]}
        e = etat_du_moment({"properties": {"parameter": p}}, normales, [(5, 10)], date(2026, 11, 7))
        self.assertIn("Normale ≈ 81 mm", e["tuiles"][0]["source"])  # 101×24/31 + 19×4/30
        self.assertIn("Normale 33 °C", e["tuiles"][1]["source"])  # (32×24 + 36×4) / 28 ≈ 32,6
        self.assertEqual(e["dateFin"], "2026-11-04")
