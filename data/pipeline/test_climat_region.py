import json
import unittest
from pathlib import Path

from build_climat import climat_reel

ICI = Path(__file__).resolve().parent
RAW = json.loads((ICI.parent / "raw" / "power_korhogo_monthly.json").read_text(encoding="utf-8"))
MODELE = json.loads((ICI.parent / "pilot" / "korhogo" / "climat.json").read_text(encoding="utf-8"))
KORHOGO = {"id": "poro", "nom": "Poro", "chefLieu": "Korhogo", "lat": 9.4581, "lon": -5.6316}


class TestClimatReel(unittest.TestCase):
    def test_korhogo_une_saison(self):
        c = climat_reel(MODELE, RAW, KORHOGO)
        self.assertEqual(len(c["pluieMensuelle"]), 12)
        self.assertEqual(len(c["saisons"]), 1)
        self.assertEqual(c["saisonPluies"], c["saisons"][0])
        self.assertIn("Une seule saison", c["indicateurs"][0]["source"])
        self.assertIn("Korhogo", c["meta"]["source"])
        self.assertEqual(c["meta"]["exempleDe"], "Korhogo")

    def test_ne_modifie_pas_le_modele(self):
        avant = json.dumps(MODELE, sort_keys=True)
        climat_reel(MODELE, RAW, KORHOGO)
        self.assertEqual(json.dumps(MODELE, sort_keys=True), avant)


if __name__ == "__main__":
    unittest.main()


class TestLibelleSaisons(unittest.TestCase):
    def test_un_seul_mois_s_ecrit_sans_fleche(self):
        from build_climat import libelle_saisons
        self.assertEqual(libelle_saisons([(3, 6), (10, 10)]), "Mars → Juin · Oct")
        self.assertEqual(libelle_saisons([(5, 10)]), "Mai → Oct")


if __name__ == "__main__":
    unittest.main()
