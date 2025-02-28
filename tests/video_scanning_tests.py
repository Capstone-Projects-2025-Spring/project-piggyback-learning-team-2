import json
import unittest
import os

#Tests if the contents of the .json files can be printed
class TestJsonFileLoading(unittest.TestCase):
    def test_load_json(self):
        """Test loading and printing a specific JSON file."""
        filename = "aws_storage_test.json"  # Change this to the file you want to test
        file_path = os.path.join(os.path.dirname(__file__), "..", filename)

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Contents of {filename}:")
        print(json.dumps(data, indent=4))  # Pretty print JSON

        self.assertIsInstance(data, dict, f"{filename} should contain a JSON object")
        self.assertTrue(len(data) > 0, f"{filename} should not be empty")

if __name__ == "__main__":
    unittest.main()