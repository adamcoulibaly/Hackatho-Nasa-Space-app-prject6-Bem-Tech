"""Tests du moteur de saison : semis (Sivakumar), bilan d'eau FAO-56, verdict."""
import json
import math
import unittest
from datetime import date, timedelta
from pathlib import Path

from saison import bilan, date_semis, et0_hargreaves, ra_mm, verdict_saison

CULTURES = {c["nom"]: c for c in json.loads((Path(__file__).resolve().parents[2] / "knowledge" / "cultures.json").read_text("utf8"))}
LAT = 9.45
DEBUT = date(2010, 1, 1)
MAI = (date(2010, 5, 1) - DEBUT).days
SAISON = {"debut": 5, "fin": 10}


def jours(pluie):
    n = len(pluie)
    return {"debut": DEBUT.isoformat(), "pluie": pluie, "tmax": [32.0] * n, "tmin": [22.0] * n}


def serie(defaut=0.0, n=730):
    return [defaut] * n


class TestRayonnementEtEvaporation(unittest.TestCase):
    def test_ra_fao56(self):
        # Exemple 8 de FAO-56 : 20° S, 3 septembre → Ra = 32,2 MJ m-2 j-1.
        self.assertAlmostEqual(ra_mm(-20, 246), 32.2 * 0.408, delta=0.1)

    def test_et0_hargreaves(self):
        self.assertAlmostEqual(et0_hargreaves(30, 20, 15), 0.0023 * 15 * 42.8 * math.sqrt(10), delta=0.01)


class TestSemis(unittest.TestCase):
    def test_semis_ideal(self):
        p = serie(0.0, 60)
        p[10] = p[11] = p[12] = 8.0
        for i in range(13, 60):
            p[i] = 2.0
        self.assertEqual(date_semis(p, 0, 40), 12)

    def test_faux_depart(self):
        p = serie(0.0, 80)
        p[5] = 25.0  # puis 8 jours secs : faux départ
        p[30] = 25.0
        for i in range(31, 80):
            p[i] = 2.0
        self.assertEqual(date_semis(p, 0, 50), 30)

    def test_pas_de_semis(self):
        self.assertIsNone(date_semis(serie(0.5, 80), 0, 50))


class TestVerdict(unittest.TestCase):
    def test_saison_seche_perdue(self):
        v = verdict_saison(jours(serie(0.5)), LAT, 2010, SAISON, CULTURES["Maïs"])
        self.assertEqual(v["verdict"], "perdue")
        self.assertIsNone(v["semis"])
        self.assertEqual(v["cause"], "pas assez de pluie pour semer")

    def test_saison_ideale_bonne(self):
        p = serie(0.0)
        for i in range(MAI, MAI + 200):
            p[i] = 8.0
        v = verdict_saison(jours(p), LAT, 2010, SAISON, CULTURES["Maïs"])
        self.assertEqual(v["verdict"], "bonne")
        self.assertEqual(v["semis"], "2010-05-03")
        self.assertGreaterEqual(v["ratio"], 0.75)

    def test_poche_seche_floraison(self):
        p = serie(0.0)
        for i in range(MAI, MAI + 200):
            p[i] = 8.0
        semis = MAI + 2
        # Maïs : 110 j, stades FAO ramenés à [18, 31, 35, 26] → mi-saison de J+49 à J+83.
        for i in range(semis + 55, semis + 65):
            p[i] = 0.0
        v = verdict_saison(jours(p), LAT, 2010, SAISON, CULTURES["Maïs"])
        self.assertIn("10 jours secs pendant la floraison du maïs", v["cause"])

    def test_elision_de_l(self):
        p = serie(0.0)
        for i in range(MAI, MAI + 200):
            p[i] = 8.0
        for i in range(MAI + 2 + 60, MAI + 2 + 70):
            p[i] = 0.0
        v = verdict_saison(jours(p), LAT, 2010, SAISON, CULTURES["Arachide"])
        self.assertIn("pendant la floraison de l'arachide", v["cause"])

    def test_donnees_manquantes(self):
        p = serie(0.0)
        for i in range(MAI, MAI + 200):
            p[i] = 8.0
        for i in range(MAI + 20, MAI + 40):  # 20 jours sur 110 : plus de 10 % du cycle
            p[i] = None
        self.assertIsNone(verdict_saison(jours(p), LAT, 2010, SAISON, CULTURES["Maïs"]))

    def test_cycle_hors_serie(self):
        p = serie(0.0, 365 + MAI + 100)
        for i in range(365 + MAI, len(p)):
            p[i] = 8.0
        self.assertIsNone(verdict_saison(jours(p), LAT, 2011, SAISON, CULTURES["Manioc"]))

    def test_deux_saisons_fenetre(self):
        # Saison principale de mars à juillet : la pluie de juin (hors fenêtre mars → mai) ne déclenche pas de semis.
        p = serie(0.0)
        juin = (date(2010, 6, 1) - DEBUT).days
        for i in range(juin, juin + 150):
            p[i] = 8.0
        v = verdict_saison(jours(p), LAT, 2010, {"debut": 3, "fin": 7}, CULTURES["Maïs"])
        self.assertEqual(v["verdict"], "perdue")
        self.assertIsNone(v["semis"])

    def test_bilan_renvoie_ratios(self):
        p = serie(0.0)
        for i in range(MAI, MAI + 200):
            p[i] = 8.0
        b = bilan(p, [32.0] * 730, [22.0] * 730, LAT, DEBUT, MAI + 2, CULTURES["Maïs"])
        self.assertEqual(set(b), {"ratio", "pocheFloraison", "pocheMax"})
        self.assertEqual(b["pocheFloraison"], 0)


if __name__ == "__main__":
    unittest.main()
