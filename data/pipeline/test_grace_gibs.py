import json
import unittest
from datetime import date
from pathlib import Path

from climat_complet import climat_complet
from grace_gibs import dates_par_mois, ecarts_annuels
from ndvi_gibs import charger_palette

ICI = Path(__file__).resolve().parent
PALETTE = charger_palette((ICI / "fixtures" / "gibs_grace_colormap.xml").read_text(encoding="utf-8"))
DATES = (ICI / "fixtures" / "grace_dates.txt").read_text(encoding="utf-8").split()


class TestPaletteGrace(unittest.TestCase):
    def test_bornes_infinies_ramenees_a_la_borne_finie(self):
        self.assertEqual(PALETTE[(0, 51, 255)], -30.0)
        self.assertEqual(PALETTE[(255, 51, 0)], 30.0)
        self.assertAlmostEqual(PALETTE[(2, 52, 255)], -29.875, places=3)
        self.assertIsNone(PALETTE[(0, 0, 0)])


class TestDates(unittest.TestCase):
    def test_une_date_par_mois_publie(self):
        d = dates_par_mois(DATES)
        self.assertEqual(d["200301"], "2003-01-01")
        self.assertEqual(d["201703"], "2017-03-17")
        self.assertNotIn("201709", d)  # lacune entre GRACE et GRACE-FO
        self.assertEqual(max(d), "202212")


class TestEcartsAnnuels(unittest.TestCase):
    def test_moyenne_par_an_et_lacune_si_moins_de_6_mois(self):
        serie = {f"2016{m:02d}": 2.0 for m in range(1, 13)}
        serie.update({"201701": -4.0, "201703": -4.0})
        serie.update({f"2019{m:02d}": (-6.0 if m <= 6 else None) for m in range(1, 13)})
        e = {x["annee"]: x["ecart"] for x in ecarts_annuels(serie, 2016, 2019)}
        self.assertEqual(e, {2016: 2.0, 2017: None, 2018: None, 2019: -6.0})


class TestIntegrationGrace(unittest.TestCase):
    def test_grace_ajoute_au_climat(self):
        mensuel = json.loads((ICI / "fixtures" / "korhogo_mensuel.json").read_text(encoding="utf-8"))
        region = {"id": "poro", "nom": "Poro", "chefLieu": "Korhogo", "lat": 9.4581, "lon": -5.6316}
        serie = {f"{a}{m:02d}": float(a - 2014) for a in range(2005, 2023) for m in range(1, 13)}
        c = climat_complet(mensuel, None, region, date(2026, 11, 8), grace=serie)
        self.assertEqual(c["grace"][0], {"annee": 2005, "ecart": -9.0})
        self.assertEqual(c["grace"][-1]["annee"], 2022)
        self.assertIn("eau stockée", c["meta"]["reel"])
        self.assertNotIn("grace", climat_complet(mensuel, None, region, date(2026, 11, 8)))


if __name__ == "__main__":
    unittest.main()
