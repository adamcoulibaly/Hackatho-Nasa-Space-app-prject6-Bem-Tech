import unittest

from imerg import fenetre, indice_lat, indice_lon, lire_ascii, mm_par_mois, pluie_au_point, recoupement

ASCII = """Dataset: 3B-MO.MS.MRG.3IMERG.20200801-S000000-E235959.08.V07B.HDF5
precipitation[0][0], 0.202, 0.215, 0.205
precipitation[0][1], 0.199, -9999.9, 0.2
"""


class TestImerg(unittest.TestCase):
    def test_indices_de_la_grille(self):
        # Korhogo : la cellule de centre (-5,65 ; 9,45), comme le renvoie GES DISC.
        self.assertEqual(indice_lon(-5.63), 1743)
        self.assertEqual(indice_lat(9.46), 994)
        self.assertEqual(indice_lon(-180), 0)
        self.assertEqual(indice_lon(180), 3599)

    def test_fenetre_couvre_les_carres_de_tous_les_points(self):
        x0, x1, y0, y1 = fenetre([(9.46, -5.63), (5.32, -4.02)])
        self.assertEqual((x0, x1), (1743 - 2, 1759 + 2))
        self.assertEqual((y0, y1), (953 - 2, 994 + 2))

    def test_lecture_ascii_et_valeurs_manquantes(self):
        g = lire_ascii(ASCII)
        self.assertEqual(g[0], [0.202, 0.215, 0.205])
        self.assertIsNone(g[1][1])

    def test_moyenne_au_point_ignore_les_trous(self):
        g = [[1.0] * 5 for _ in range(5)]
        g[2][2] = None
        self.assertAlmostEqual(pluie_au_point(g, 100, 200, (202 + 0.5) * 0.1 - 90, (102 + 0.5) * 0.1 - 180), 1.0)
        trous = [[None] * 5 for _ in range(5)]
        self.assertIsNone(pluie_au_point(trous, 100, 200, (202 + 0.5) * 0.1 - 90, (102 + 0.5) * 0.1 - 180))

    def test_mm_par_mois(self):
        self.assertAlmostEqual(mm_par_mois(0.202, 2020, 8), 0.202 * 24 * 31)
        self.assertAlmostEqual(mm_par_mois(1.0, 2024, 2), 24 * 29)

    def test_recoupement_identique_puis_decale(self):
        power = {(a, m): float(m * 10 + a % 3) for a in range(2005, 2008) for m in range(1, 13)}
        imerg = {f"{a}{m:02d}": v for (a, m), v in power.items()}
        r = recoupement(imerg, power)
        self.assertEqual(r["ecartPct"], 0)
        self.assertEqual(r["correlation"], 1.0)
        self.assertEqual(r["accord"], "bon")
        self.assertEqual(r["mois"], 36)
        self.assertEqual(r["periode"], "2005–2007")
        plus = {k: v * 1.5 for k, v in imerg.items()}
        r2 = recoupement(plus, power)
        self.assertEqual(r2["ecartPct"], 50)
        self.assertEqual(r2["accord"], "faible")

    def test_trop_peu_de_mois_communs(self):
        self.assertIsNone(recoupement({"200501": 10.0}, {(2005, 1): 12.0}))


if __name__ == "__main__":
    unittest.main()
