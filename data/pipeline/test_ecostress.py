import math
import unittest

from ecostress import SEUIL_CHAUD, anneau, de_jour, kelvin_vers_celsius, resume, valeur_passage


class TestEcostress(unittest.TestCase):
    def test_anneau_a_12_km(self):
        pts = anneau(9.46, -5.63)
        self.assertEqual(len(pts), 8)
        for lat, lon in pts:
            d = math.hypot((lat - 9.46) * 111.32, (lon + 5.63) * 111.32 * math.cos(math.radians(9.46)))
            self.assertAlmostEqual(d, 12.0, places=6)

    def test_passages_de_jour_seulement(self):
        self.assertTrue(de_jour("2023-01-17T16:37:08.000Z"))
        self.assertTrue(de_jour("2023-01-04T09:00:38Z"))
        self.assertFalse(de_jour("2023-01-02T22:17:19Z"))
        self.assertFalse(de_jour("2023-03-02T04:10:00Z"))

    def test_kelvin_et_mediane_des_points_clairs(self):
        self.assertAlmostEqual(kelvin_vers_celsius(313.15), 40.0)
        self.assertEqual(valeur_passage([None, 30.0, 34.0, 38.0, None]), 34.0)
        self.assertIsNone(valeur_passage([30.0, None, 31.0]))
        self.assertIsNone(valeur_passage([float("nan"), 30.0, 31.0]))

    def test_resume_mensuel_et_jours_chauds(self):
        lst = {"2023-02-03T12:00:00": 44.0, "2024-02-10T12:00:00": 42.0, "2023-08-01T12:00:00": 30.0, "2023-08-20T12:00:00": 32.0}
        et = {"2023-08-01T12:00:00": 3.5}
        r = resume(lst, et, "2023–2024")
        self.assertEqual(r["lst"][1], 43.0)
        self.assertEqual(r["lst"][7], 31.0)
        self.assertIsNone(r["lst"][0])
        self.assertEqual(r["et"][7], 3.5)
        self.assertEqual(r["passages"], 4)
        self.assertEqual(r["joursChauds"], 0.5)
        self.assertEqual(r["seuil"], SEUIL_CHAUD)
        self.assertIsNone(resume({}, {}, "2023–2024"))


if __name__ == "__main__":
    unittest.main()
