# Paraskeva Pyatnitsa Chapel — reference notes

Written from 5 photos the user shared in chat (front ×2, side view with the square, far view on grass, aerial from above).
The photo files themselves should be saved next to this file.

## Silhouette, bottom to top (share of total height)

| Part | Height | Shape |
|---|---|---|
| Plinth | ~5% | dark grey, octagonal, slightly wider than the walls |
| Walls | ~30% | white octagon; its width ≈ 0.37 × total height |
| Cornice | thin | white ring sticking out past the walls, thin green edge on top |
| Kokoshnik tier | ~12% | 8 white arched gables, one per face, pointed tops |
| Lower roof ("skirt") | ~16% | green, flares out, about as wide as the walls at the bottom; vertical seams |
| Roof belt | thin | green horizontal ring with a small overhang |
| Upper tent roof | ~25% | tall, narrow green octagonal cone; small white-framed arched vents about a quarter of the way up |
| Neck | ~5% | small white octagonal drum |
| Dome | ~5% | small gilded pear-shaped cupola |
| Cross | ~6% | gold Orthodox cross |

## Details that make it recognizable

1. Plan is an **octagon** (clearly visible from above).
2. **Two-step green tent roof**: a flared skirt, then a belt, then a tall spire.
3. **Ring of white kokoshnik arches** between the walls and the roof.
4. On the walls: narrow **arched windows with brown lattice**, a small triangular gable above each; flat corner pilasters.
5. On the front face, an **icon** instead of a window: saint in a blue robe on a gold background.
6. Small gold dome and cross on a white neck.

## Surroundings on the hilltop

- Octagonal paved platform (grey), low black metal fence around it.
- Street lamps (black post, two white globes).
- A separate tall dark Orthodox cross beside the platform, with steps.
- Grass slopes; the city spreads below.
- Easter egg per SPEC: a big 10-ruble banknote nearby (the chapel is printed on it).

## Suggested palette additions

`chapelWhite` ~#f1f0ea, `roofGreen` ~#23884a, `gold` ~#d9a93a, `plinth` ~#4b5057, `lattice` ~#8b6a48, `iconBlue` ~#3d6fb0, `paving` ~#a39d94, `fence` ~#26292d.

## Primitive plan

Octagons: `CylinderGeometry` / `ConeGeometry` with `radialSegments = 8`, flat shading.
Kokoshniks: thin box plus a small 4-sided cone for the pointed top, 8 copies around.
Windows: a dark lattice box with a half-cylinder arch on top.
Budget: about 60–100 meshes; repeated parts can be instanced.
