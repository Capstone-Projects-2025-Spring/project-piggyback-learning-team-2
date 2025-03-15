import json

# Define input and output file paths
input_file = 'manifest.json'       # The file you generated
output_file = 'manifest.jsonl'     # The file CVAT expects

# Open the input file and create the output file
with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
    for line in f_in:
        # Split each line into components
        parts = line.strip().split()
        if len(parts) < 4:
            continue  # Skip lines that don't have enough data

        # Extract relevant information
        file_path = parts[3]       # The file path is the 4th element
        file_size = int(parts[2])  # The size is the 3rd element

        # Create a dictionary and write it as a JSON line
        json_line = json.dumps({"name": file_path, "size": file_size})
        f_out.write(json_line + '\n')

print("Converted to manifest.jsonl successfully!")