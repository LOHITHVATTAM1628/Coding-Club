from PIL import Image

def remove_bg(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        pixels = img.load()
        width, height = img.size
        
        # Get background color from top-left pixel (assumed to be the blue background)
        bg_color = pixels[0, 0]
        bg_r, bg_g, bg_b, _ = bg_color
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # Calculate color distance from background
                dist = ((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)**0.5
                
                if dist < 120:  # Tolerance threshold
                    # If it's close to the background color, make it transparent
                    # Also fade the alpha based on distance for smoother edges
                    alpha = int(max(0, (dist / 120) * 255))
                    if alpha < 100: 
                        alpha = 0
                    pixels[x, y] = (r, g, b, alpha)
                else:
                    # Keep white/logo colors intact
                    pixels[x, y] = (r, g, b, a)
                    
        img.save(img_path, "PNG")
        print("Success: Background removed")
    except Exception as e:
        print("Error:", e)

remove_bg("client/public/logo.png")
