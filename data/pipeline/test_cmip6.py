"""Tests de la lecture des projections NASA NEX-GDDP-CMIP6."""
import unittest
from pathlib import Path

from cmip6 import aligner_annee, lire_points, nom_fichier, part_bonnes, url_ncss

EXTRAIT = (Path(__file__).resolve().parent / "fixtures" / "cmip6_extrait.nc").read_bytes()
POINTS = {"poro": (9.4580, -5.6295), "abidjan": (5.3204, -4.0161)}


class TestLecture(unittest.TestCase):
    def test_lire_points_pluie_en_mm(self):
        s = lire_points(EXTRAIT, "pr", POINTS)
        self.assertEqual(set(s), {"poro", "abidjan"})
        self.assertEqual(len(s["poro"]), 3)
        for v in s["poro"] + s["abidjan"]:
            self.assertGreaterEqual(v, 0)
            self.assertLess(v, 300)
        # 1 kg m-2 s-1 = 86 400 mm/j : une pluie de juillet de quelques mm, pas 1e-4.
        self.assertGreater(max(s["poro"] + s["abidjan"]), 0.5)

    def test_hors_boite_refuse(self):
        with self.assertRaises(ValueError):
            lire_points(EXTRAIT, "pr", {"paris": (48.85, 2.35)})


class TestNoms(unittest.TestCase):
    def test_nom_fichier_version(self):
        cles = [
            "NEX-GDDP-CMIP6/MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2050.nc",
            "NEX-GDDP-CMIP6/MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2050_v1.1.nc",
            "NEX-GDDP-CMIP6/MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2050_v2.0.nc",
            "NEX-GDDP-CMIP6/MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2051_v2.0.nc",
        ]
        n = nom_fichier("MRI-ESM2-0", "ssp245", "pr", 2050, lambda prefixe: [c for c in cles if c.startswith(prefixe)])
        self.assertEqual(n, "MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2050_v2.0.nc")

    def test_nom_fichier_absent(self):
        with self.assertRaises(FileNotFoundError):
            nom_fichier("MRI-ESM2-0", "ssp245", "pr", 2050, lambda prefixe: [])

    def test_url_ncss(self):
        u = url_ncss("MRI-ESM2-0/ssp245/r1i1p1f1/pr/pr_day_MRI-ESM2-0_ssp245_r1i1p1f1_gn_2050_v2.0.nc", "pr")
        self.assertTrue(u.startswith("https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6/MRI-ESM2-0/"))
        for morceau in ("var=pr", "north=11", "south=4", "west=-9", "east=-2.5", "temporal=all", "accept=netcdf3"):
            self.assertIn(morceau, u)


class TestCalendrier(unittest.TestCase):
    def test_annee_bissextile_sans_29_fevrier(self):
        v = aligner_annee(list(range(365)), 2048)
        self.assertEqual(len(v), 366)
        self.assertEqual(v[58:61], [58, 58, 59])  # le 29 février reprend la valeur du 28

    def test_annee_normale_inchangee(self):
        self.assertEqual(aligner_annee(list(range(365)), 2050), list(range(365)))
        self.assertEqual(len(aligner_annee(list(range(366)), 2048)), 366)

    def test_calendrier_inattendu(self):
        with self.assertRaises(ValueError):
            aligner_annee(list(range(360)), 2050)


class TestPart(unittest.TestCase):
    def test_part_bonnes(self):
        v = [{"verdict": "bonne"}, {"verdict": "bonne"}, {"verdict": "perdue"}, {"verdict": "difficile"}]
        self.assertEqual(part_bonnes(v), 0.5)
        self.assertIsNone(part_bonnes([]))


if __name__ == "__main__":
    unittest.main()


class TestHorizons(unittest.TestCase):
    def test_trois_horizons_de_20_ans(self):
        from cmip6 import HORIZONS
        self.assertEqual({h: (r.start, r.stop - 1) for h, r in HORIZONS.items()}, {"2030": (2021, 2040), "2040": (2031, 2050), "2050": (2041, 2060)})

    def test_taches_couvrent_2021_a_2060(self):
        import build_projections as b
        t = b.taches()
        self.assertEqual(len(t), 3 * 3 * (20 + 2 * 40))
        self.assertIn(("IPSL-CM6A-LR", "ssp585", "pr", 2021), t)
