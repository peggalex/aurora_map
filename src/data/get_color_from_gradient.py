from PIL import Image

# https://stackoverflow.com/a/50894365


def rgb_of_pixel(image, x, y):
    r, g, b = image.getpixel((x, y))
    a = (r, g, b)
    return a


# heatmapGradient.PNG is created using a screenshot from the SVG in gradient.svg
path = 'heatmapGradient.png'
image = Image.open(path).convert('RGB')
width = image.size[0]

arr = []
for i in range(100):
    x = round(width*i/100)
    rgb = rgb_of_pixel(image, x, 0)
    arr.append(f"{rgb}")

print(arr)
