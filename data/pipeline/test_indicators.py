import unittest

from indicators import (
    climatologie,
    mann_kendall,
    niveau,
    pluie_mm_mois,
    saison_des_pluies,
)

EXEMPLE = [5, 15, 40, 80, 120, 150, 190, 260, 200, 90, 20, 5]


class TestPluie(unittest.TestCase):
    def test_conversion_mm_par_jour_en_mm_par_mois(self):
        self.assertAlmostEqual(pluie_mm_mois(2.0, 2021, 1), 62.0)  # 31 jours
        self.assertAlmostEqual(pluie_mm_mois(2.0, 2021, 2), 56.0)  # 28 jours
        self.assertAlmostEqual(pluie_mm_mois(2.0, 2024, 2), 58.0)  # année bissextile


class TestClimatologie(unittest.TestCase):
    def test_moyenne_par_mois_sur_les_annees(self):
        serie = {(2020, 1): 10.0, (2021, 1): 20.0, (2020, 2): 5.0}
        self.assertEqual(climatologie(serie)[0], 15.0)
        self.assertEqual(climatologie(serie)[1], 5.0)

    def test_mois_sans_donnee_donne_none(self):
        self.assertIsNone(climatologie({(2020, 1): 1.0})[5])

    def test_ignore_les_valeurs_manquantes_de_la_nasa(self):
        self.assertEqual(climatologie({(2020, 1): -999.0, (2021, 1): 4.0})[0], 4.0)


class TestSaison(unittest.TestCase):
    def test_mois_au_dessus_de_la_moyenne_mensuelle(self):
        # total 1175, moyenne 97,9 : mai (120) à septembre (200) dépassent ; octobre (90) non
        self.assertEqual(saison_des_pluies(EXEMPLE), (5, 9))

    def test_saison_qui_chevauche_la_fin_d_annee(self):
        pluie = [100, 90, 5, 0, 0, 0, 0, 0, 5, 20, 80, 120]
        self.assertEqual(saison_des_pluies(pluie), (11, 2))

    def test_aucune_pluie(self):
        self.assertIsNone(saison_des_pluies([0] * 12))


class TestMannKendall(unittest.TestCase):
    def test_hausse(self):
        self.assertEqual(mann_kendall(list(range(1, 21)))["tendance"], "hausse")

    def test_baisse(self):
        self.assertEqual(mann_kendall(list(range(20, 0, -1)))["tendance"], "baisse")

    def test_serie_plate_ou_bruitee_n_a_pas_de_tendance(self):
        self.assertEqual(mann_kendall([5] * 20)["tendance"], "aucune")
        self.assertEqual(mann_kendall([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4])["tendance"], "aucune")

    def test_serie_trop_courte(self):
        self.assertEqual(mann_kendall([1, 2, 3])["tendance"], "aucune")


class TestNiveau(unittest.TestCase):
    def test_echelle_de_0_a_4(self):
        self.assertEqual(niveau(0, 0, 100), 0)
        self.assertEqual(niveau(100, 0, 100), 4)
        self.assertEqual(niveau(50, 0, 100), 2)

    def test_bornes_identiques(self):
        self.assertEqual(niveau(7, 7, 7), 0)


if __name__ == "__main__":
    unittest.main()


class TestSaisons(unittest.TestCase):
    def test_une_saison_au_nord(self):
        from indicators import saisons_des_pluies
        self.assertEqual(saisons_des_pluies(EXEMPLE), [(5, 9)])

    def test_deux_saisons_au_sud(self):
        from indicators import saisons_des_pluies
        sud = [20, 50, 110, 160, 280, 420, 180, 40, 60, 170, 150, 70]
        self.assertEqual(saisons_des_pluies(sud), [(4, 7), (10, 11)])

    def test_un_mois_isole_et_faible_n_est_pas_une_saison(self):
        from indicators import saisons_des_pluies
        # février dépasse à peine la moyenne : moins de 10 % de la pluie de l'année
        pluie = [0, 90, 0, 0, 120, 150, 190, 260, 200, 60, 0, 0]
        self.assertEqual(saisons_des_pluies(pluie), [(5, 9)])

    def test_aucune_pluie(self):
        from indicators import saisons_des_pluies
        self.assertEqual(saisons_des_pluies([0] * 12), [])
