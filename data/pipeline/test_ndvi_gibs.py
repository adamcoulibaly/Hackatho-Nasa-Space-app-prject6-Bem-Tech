import io
import json
import unittest
from datetime import date
from pathlib import Path

from PIL import Image

from climat_complet import climat_complet
from ndvi_gibs import charger_palette, ndvi_au_point, position_tuile

ICI = Path(__file__).resolve().parent
PALETTE = charger_palette((ICI / "fixtures" / "gibs_ndvi_colormap.xml").read_text(encoding="utf-8"))


def tuile(index: int, rgb: tuple[int, int, int], transparent: bool = False) -> bytes:
    im = Image.new("P", (256, 256), index)
    pal = [0] * 768
    pal[index * 3 : index * 3 + 3] = list(rgb)
    im.putpalette(pal)
    if transparent:
        im.info["transparency"] = index
    b = io.BytesIO()
    im.save(b, format="PNG", transparency=index) if transparent else im.save(b, format="PNG")
    return b.getvalue()


class TestPalette(unittest.TestCase):
    def test_couleur_vers_ndvi(self):
        self.assertAlmostEqual(PALETTE[(0, 24, 1)], 0.9951, places=3)  # plage [0,9901 ; 1,0001)
        self.assertAlmostEqual(PALETTE[(241, 236, 236)], 0.0026, places=3)

    def test_couleurs_transparentes_sans_valeur(self):
        self.assertIsNone(PALETTE[(0, 26, 105)])  # pas de donnée


class TestPosition(unittest.TestCase):
    def test_korhogo_zoom_7(self):
        tx, ty, px, py = position_tuile(9.4581, -5.6316, 7)
        self.assertEqual((tx, ty), (61, 60))
        self.assertTrue(0 <= px < 256 and 0 <= py < 256)


class TestLecture(unittest.TestCase):
    def test_valeur_moyenne_autour_du_point(self):
        self.assertAlmostEqual(ndvi_au_point(tuile(5, (0, 24, 1)), 100, 100, PALETTE), 0.9951, places=3)

    def test_pas_de_donnee(self):
        self.assertIsNone(ndvi_au_point(tuile(7, (0, 26, 105), transparent=True), 100, 100, PALETTE))


class TestIntegration(unittest.TestCase):
    def test_vegetation_ajoutee_au_climat(self):
        mensuel = json.loads((ICI / "fixtures" / "korhogo_mensuel.json").read_text(encoding="utf-8"))
        ndvi = {f"{a}{m:02d}": (0.30 if m in (1, 2, 3, 12) else 0.70) for a in range(2005, 2026) for m in range(1, 13)}
        ndvi["200601"] = None
        region = {"id": "poro", "nom": "Poro", "chefLieu": "Korhogo", "lat": 9.4581, "lon": -5.6316}
        c = climat_complet(mensuel, None, region, date(2026, 11, 8), ndvi=ndvi)
        self.assertEqual([o["id"] for o in c["onglets"]], ["pluie", "chaleur", "sol", "veg"])
        self.assertEqual(c["matrice"][-1]["label"], "Végétation")
        self.assertIn("végétation", c["meta"]["reel"])
        self.assertEqual(c["indicateurs"][-1]["label"], "Végétation au plus bas")
        self.assertTrue(c["indicateurs"][-1]["valeur"].startswith("Janvier"))
        sans = climat_complet(mensuel, None, region, date(2026, 11, 8))
        self.assertEqual([o["id"] for o in sans["onglets"]], ["pluie", "chaleur", "sol"])


if __name__ == "__main__":
    unittest.main()


class TestAnneau(unittest.TestCase):
    def test_la_ville_au_centre_est_exclue(self):
        im = Image.new("P", (256, 256), 5)  # campagne : NDVI ≈ 0,995
        pal = [0] * 768
        pal[15:18] = [0, 24, 1]
        pal[18:21] = [241, 236, 236]  # ville : NDVI ≈ 0,003
        im.putpalette(pal)
        for x in range(122, 135):  # ville : disque de moins de 6 pixels de rayon (≈ 14 km de diamètre)
            for y in range(122, 135):
                if (x - 128) ** 2 + (y - 128) ** 2 < 36:
                    im.putpixel((x, y), 6)
        b = io.BytesIO()
        im.save(b, format="PNG")
        self.assertAlmostEqual(ndvi_au_point(b.getvalue(), 128, 128, PALETTE), 0.9951, places=3)
