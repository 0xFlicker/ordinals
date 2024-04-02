#!/bin/bash

# Define the input and output directories
input_dir=$1
output_dir=$2

# Create the output directory if it doesn't exist
mkdir -p "$output_dir"

# Find all transparent PNG files recursively in the input directory
find "$input_dir" -type f -name "*.png" | while read -r input_file; do
    # Determine the output file name
    modified_input_file="${input_file// /-}"
    output_file="${modified_input_file/$input_dir/$output_dir}"
    output_file="${output_file%.png}.webp"
    # Create the nested output directory if it doesn't exist
    mkdir -p "$(dirname "$output_file")"
    # Convert the PNG file to WebP using cwebp with the highest compression level (100)
    # cwebp -q 100 -lossless -metadata none "$input_file" -o "$output_file"
    
    cwebp -q 40 -metadata none "$input_file" -o "$output_file"
    # Optional: Remove the original PNG file
    # rm "$input_file"
done
