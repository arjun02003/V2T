import os
import zlib
import struct

def create_tech_placeholder(width, height, line_color, bg_color=(12, 12, 22)):
    """
    Generates a PNG image bytearray of a futuristic tech grid.
    """
    img_data = bytearray()
    for y in range(height):
        img_data.append(0) # PNG scanline filter type 0 (None)
        for x in range(width):
            # Grid condition (every 40px)
            is_grid = (x % 40 == 0) or (y % 40 == 0)
            
            # Sub-grid (thin lines, every 10px)
            is_subgrid = (x % 10 == 0) or (y % 10 == 0)
            
            # Cyber corners/borders
            is_border = (x < 4) or (x >= width - 4) or (y < 4) or (y >= height - 4)
            is_corners = ((x < 25 or x >= width - 25) and (y < 25 or y >= height - 25))
            
            # Diagonal design elements
            is_diag = abs(x - y) < 2 or abs(x + y - width) < 2
            
            if is_border and is_corners:
                # Glowing neon borders at corners
                img_data.extend(line_color)
            elif is_grid:
                # Stronger grid line
                # Blend line color with background slightly
                grid_col = tuple(int(c * 0.6 + bg * 0.4) for c, bg in zip(line_color, bg_color))
                img_data.extend(grid_col)
            elif is_subgrid:
                # Very faint grid line
                sub_col = tuple(int(c * 0.2 + bg * 0.8) for c, bg in zip(line_color, bg_color))
                img_data.extend(sub_col)
            elif is_diag and (x % 8 == 0) and (y > 40 and y < height - 40) and (x > 40 and x < width - 40):
                # Glowing dotted diagonal line
                img_data.extend(line_color)
            else:
                img_data.extend(bg_color)
                
    # PNG format construction
    png = bytearray([137, 80, 78, 71, 13, 10, 26, 10]) # PNG signature
    
    # IHDR chunk
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png += struct.pack(">I", 13) + b"IHDR" + ihdr_data + struct.pack(">I", zlib.crc32(b"IHDR" + ihdr_data))
    
    # IDAT chunk
    compressed = zlib.compress(img_data)
    png += struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", zlib.crc32(b"IDAT" + compressed))
    
    # IEND chunk
    png += struct.pack(">I", 0) + b"IEND" + struct.pack(">I", zlib.crc32(b"IEND"))
    
    return png

def main():
    # Define colors
    cyan = (0, 240, 255)
    magenta = (255, 0, 127)
    purple = (189, 0, 255)
    orange = (255, 127, 0)
    green = (0, 255, 127)
    blue = (0, 127, 255)
    
    # Define files to create
    files = {
        "images/art": [
            ("art1.jpg", cyan),
            ("art2.jpg", magenta),
            ("art3.jpg", purple),
            ("art4.jpg", blue)
        ],
        "images/event": [
            ("event1.jpg", orange),
            ("event2.jpg", cyan),
            ("event3.jpg", magenta),
            ("event4.jpg", green)
        ],
        "images/interior": [
            ("interior1.jpg", green),
            ("interior2.jpg", blue),
            ("interior3.jpg", purple),
            ("interior4.jpg", orange)
        ]
    }
    
    print("Generating placeholder images...")
    
    # Dimensions (800x600 for standard landscape gallery items)
    width, height = 800, 600
    
    for folder, items in files.items():
        # Create folder if it doesn't exist
        os.makedirs(folder, exist_ok=True)
        for filename, color in items:
            filepath = os.path.join(folder, filename)
            print(f"Creating {filepath}...")
            img_bytes = create_tech_placeholder(width, height, color)
            with open(filepath, "wb") as f:
                f.write(img_bytes)
                
    print("All placeholders generated successfully!")

if __name__ == "__main__":
    main()
