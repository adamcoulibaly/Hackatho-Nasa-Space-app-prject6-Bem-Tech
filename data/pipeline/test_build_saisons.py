"""Tests des séries journalières réelles et des tables de verdicts par région."""
import json
import unittest
from pathlib import Path

from build_saisons import serie_depuis_power, table_region

CULTURES = json.loads((Path(__file__).resolve().parents[2] / "knowledge" / "cultures.json").read_text("utf8"))


def brut(pluie, tmax, tmin, debut="20100101"):
    from datetime import date, timedelta
    d0 = date(int(debut[:4]), int(debut[4:6]), int(debut[6:]))
    cles = [(d0 + timedelta(days=i)).strftime("%Y%m%d") for i in range(len(pluie))]
    return {"properties": {"parameter": {
        "PRECTOTCORR": dict(zip(cles, pluie)), "T2M_MAX": dict(zip(cles, tmax)), "T2M_MIN": dict(zip(cles, tmin))}}}


class TestSerie(unittest.TestCase):
    def test_serie_depuis_power(self):
        s = serie_depuis_power(brut([1.0, -999, 3.0, 0.0, 2.0], [30] * 5, [20, 20, -999, 20, 20]))
        self.assertEqual(s["debut"], "2010-01-01")
        self.assertEqual(s["pluie"], [1.0, None, 3.0, 0.0, 2.0])
        self.assertEqual(s["tmin"][2], None)
        self.assertEqual(len(s["tmax"]), 5)


class TestTable(unittest.TestCase):
    def test_table_region_exclut_none(self):
        # Deux ans de pluie régulière en saison, puis la série s'arrête : la 2e saison du manioc (300 j) dépasse la série.
        from datetime import date
        n = (date(2011, 12, 31) - date(2010, 1, 1)).days + 1
        pluie = [8.0 if 120 <= (i % 365) <= 300 else 0.0 for i in range(n)]
        jours = {"debut": "2010-01-01", "pluie": pluie, "tmax": [32.0] * n, "tmin": [22.0] * n}
        t = table_region(jours, 9.45, {"debut": 5, "fin": 10}, CULTURES, annees=range(2010, 2012))
        self.assertEqual(sorted(t), sorted(c["nom"] for c in CULTURES))
        self.assertEqual([v["annee"] for v in t["Maïs"]], [2010, 2011])
        self.assertEqual([v["annee"] for v in t["Manioc"]], [2010])


if __name__ == "__main__":
    unittest.main()


class TestPluieSaison(unittest.TestCase):
    def test_pluie_de_la_saison_par_annee(self):
        from build_saisons import pluie_par_saison
        from datetime import date
        n = (date(2011, 12, 31) - date(2010, 1, 1)).days + 1
        pluie = [0.0] * n
        mai2010 = (date(2010, 5, 1) - date(2010, 1, 1)).days
        for i in range(mai2010, mai2010 + 10):
            pluie[i] = 5.0
        pluie[mai2010 + 1] = None
        jours = {"debut": "2010-01-01", "pluie": pluie, "tmax": [30.0] * n, "tmin": [20.0] * n}
        self.assertEqual(pluie_par_saison(jours, {"debut": 5, "fin": 10}, range(2010, 2012)), {"2010": 45.0, "2011": 0.0})
