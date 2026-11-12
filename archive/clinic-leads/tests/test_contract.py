import unittest

import scrape
import sheets


class EmailValidationTest(unittest.TestCase):
    def test_accepts_real_mailboxes(self):
        for email in (
            "info@brightsmiledental.com",
            "front.desk@familydentistry.net",
            "appointments@austin-smiles.org",
        ):
            self.assertTrue(scrape.valid_email(email), email)

    def test_rejects_assets_and_placeholders(self):
        for email in (
            "logo@2x.png",
            "hero@example.com",
            "test@localhost",
            "noreply@yourdomain.com",
            "icon@site.css",
            "",
        ):
            self.assertFalse(scrape.valid_email(email), email)


class ChainFilterTest(unittest.TestCase):
    def test_chains_are_skipped(self):
        self.assertTrue(scrape.is_chain("Aspen Dental"))
        self.assertTrue(scrape.is_chain("Western Dental & Orthodontics"))

    def test_independent_practices_are_kept(self):
        self.assertFalse(scrape.is_chain("Cedar Park Family Dentistry"))
        self.assertFalse(scrape.is_chain("Dr. Nguyen Dental"))


class BusinessBuildTest(unittest.TestCase):
    def test_skips_unnamed_and_chains(self):
        elements = [
            {"type": "node", "id": 1, "tags": {"amenity": "dentist"}},
            {"type": "node", "id": 2, "tags": {"name": "Aspen Dental", "amenity": "dentist"}},
            {"type": "node", "id": 3, "tags": {"name": "Oak Dental", "amenity": "dentist"}},
        ]
        result = scrape.build_businesses(elements, "Austin, Texas")
        self.assertEqual([b["clinic"] for b in result], ["Oak Dental"])

    def test_dedupes_by_osm_id(self):
        el = {"type": "node", "id": 7, "tags": {"name": "Oak Dental", "amenity": "dentist"}}
        self.assertEqual(len(scrape.build_businesses([el, el], "Austin")), 1)


class DedupeKeyTest(unittest.TestCase):
    def test_keys_cover_osm_email_domain_and_name(self):
        lead = scrape.Lead(
            clinic="Oak Dental",
            city="Austin",
            phone="",
            website="https://www.oakdental.com",
            email="info@oakdental.com",
            email_status="mx_ok",
            source="OpenStreetMap",
            osm_id="node/7",
        )
        keys = scrape.dedupe_keys(lead)
        self.assertIn("osm:node/7", keys)
        self.assertIn("email:info@oakdental.com", keys)
        self.assertIn("domain:oakdental.com", keys)
        self.assertIn("name:oak dental|austin", keys)

    def test_host_strips_www(self):
        self.assertEqual(scrape.site_host("https://www.oakdental.com/about"), "oakdental.com")


class SheetContractTest(unittest.TestCase):
    def test_row_matches_script_columns(self):
        lead = scrape.Lead(
            clinic="Oak Dental", city="Austin", phone="+1 512 555 0100",
            website="https://oakdental.com", email="info@oakdental.com",
            email_status="mx_ok", source="OpenStreetMap", osm_id="node/7",
        )
        row = lead.row()
        self.assertEqual(len(row), sheets.SCRIPT_COLUMNS)
        self.assertEqual(sheets.HEADERS[:sheets.SCRIPT_COLUMNS], [
            "Clinic", "City", "Phone", "Website", "Email", "Email status",
            "Source", "OSM ID", "Added",
        ])

    def test_manual_columns_start_after_script_columns(self):
        self.assertEqual(sheets.HEADERS[sheets.SCRIPT_COLUMNS], "Review quote")
        self.assertIn("Pilot", sheets.HEADERS)


if __name__ == "__main__":
    unittest.main()
